import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { issueReferralCode } from "@/modules/promotions/infrastructure/referral-code";
import { premiumMonthlyRewardAllowed, qualifiesReferralForReward, referralProgress } from "@/modules/promotions/domain/referrals";
import { monthlyReferralBonus, saoPauloMonthKey } from "@/modules/promotions/domain/referral-bonus";

export const runtime = "nodejs";

/** Código por usuário; progresso financeiro exige evidência e plano no servidor. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const ctx = await getAppContext();
  if (!ctx.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });

  const profile = await prisma.referralProfile.upsert({
    where: { userId: ctx.user.id }, create: { userId: ctx.user.id, code: issueReferralCode() }, update: {},
    select: { code: true },
  });
  const now = new Date();
  const currentMonth = saoPauloMonthKey(now);
  const [referrals, subscription, commissionEntries] = await Promise.all([
    prisma.referralAttribution.findMany({
      where: { referrerUserId: ctx.user.id, revokedAt: null },
      select: {
        firstPaidAt: true, status: true, revokedAt: true,
        invitedOrganization: { select: { subscription: {
          select: { billingCycle: true, status: true, canceledAt: true },
        } } },
      },
    }),
    prisma.subscription.findUnique({
      where: { organizationId: ctx.workspace.organizationId },
      select: { planSlug: true, billingCycle: true, status: true, canceledAt: true },
    }),
    prisma.referralCommissionEntry.findMany({
      where: { referrerUserId: ctx.user.id, competenceMonth: { lte: new Date(`${currentMonth}-01T00:00:00.000Z`) } },
      select: { invitedOrganizationId: true, competenceMonth: true, amountCents: true, status: true,
        eligibleAt: true, reversedAt: true, invitedOrganization: { select: { subscription: {
          select: { billingCycle: true, status: true, canceledAt: true },
        } } } },
    }),
  ]);
  let confirmed = 0;
  let awaitingPayment = 0;
  let validating = 0;
  for (const referral of referrals) {
    const invited = referral.invitedOrganization.subscription;
    if (qualifiesReferralForReward({
      firstPaidAt: referral.firstPaidAt, status: referral.status, revokedAt: referral.revokedAt,
      billingCycle: invited?.billingCycle ?? null, subscriptionStatus: invited?.status ?? null,
      canceledAt: invited?.canceledAt ?? null,
    }, now)) confirmed += 1;
    else if (referral.firstPaidAt) validating += 1;
    else awaitingPayment += 1;
  }
  const planEligible = premiumMonthlyRewardAllowed({
    planSlug: subscription?.planSlug, billingCycle: subscription?.billingCycle,
    subscriptionStatus: subscription?.status, canceledAt: subscription?.canceledAt,
  });
  const bonus = monthlyReferralBonus({
    qualifiedReferrals: confirmed,
    month: currentMonth,
    now,
    entries: commissionEntries.map((entry) => ({
      invitedOrganizationId: entry.invitedOrganizationId,
      competenceMonth: entry.competenceMonth.toISOString().slice(0, 7),
      amountCents: entry.amountCents, status: entry.status, eligibleAt: entry.eligibleAt,
      reversedAt: entry.reversedAt,
      activeMonthly: entry.invitedOrganization.subscription?.billingCycle === "monthly"
        && entry.invitedOrganization.subscription?.status === "active"
        && !entry.invitedOrganization.subscription?.canceledAt,
    })),
  });
  return NextResponse.json({
    code: profile.code,
    pending: awaitingPayment,
    validating,
    progress: referralProgress(confirmed, planEligible),
    bonus: { period: currentMonth, ...bonus },
    planEligible,
    settlementEnabled: false,
  }, { headers: { "Cache-Control": "no-store" } });
}

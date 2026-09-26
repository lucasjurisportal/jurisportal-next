import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { getAnnualPrice, getMonthlyPrice } from "@/modules/plans/application/plan-pricing";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";
import { migrationDiscountEligibility, quoteFirstPayment } from "@/modules/promotions/domain/promotion";
import { normalizedPromotionCode, promotionCodeHash } from "@/modules/promotions/infrastructure/promotion-code";
import { normalizedReferralCode } from "@/modules/promotions/infrastructure/referral-code";
import { referralEligibility } from "@/modules/promotions/domain/referrals";

export const runtime = "nodejs";
const bodySchema = z.object({ code: z.string().trim().max(100), cycle: z.enum(["monthly","annual"]),
  planSlug: z.enum(["free","essencial","estrategico","premium","executivo","alta-corte"]) }).strict();

/** Cotação apenas. NÃO reserva nem consome cupom, não cobra e não altera assinatura. */
export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (context.workspace.role !== "owner") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const normalized = normalizedPromotionCode(parsed.data.code);
  const normalizedReferral = normalizedReferralCode(parsed.data.code);
  const plan = planCatalog.find((item) => item.slug === parsed.data.planSlug);
  if ((!normalized && !normalizedReferral) || !plan || plan.slug === "free") return NextResponse.json({ error: "PROMOTION_NOT_APPLICABLE" }, { status: 400 });
  const base = parsed.data.cycle === "annual" ? getAnnualPrice(plan) : getMonthlyPrice(plan);
  if (!base) return NextResponse.json({ error: "PROMOTION_NOT_APPLICABLE" }, { status: 400 });
  const attribution = await prisma.referralAttribution.findUnique({ where: { invitedOrganizationId: context.workspace.organizationId },
    select: { referrerUserId: true, firstPaidAt: true, revokedAt: true } });
  if (normalizedReferral) {
    const profile = await prisma.referralProfile.findUnique({ where: { code: normalizedReferral }, select: { userId: true } });
    if (!profile) return NextResponse.json({ error: "PROMOTION_NOT_APPLICABLE" }, { status: 400 });
    const sameOfficeMember = await prisma.member.findFirst({ where: { organizationId: context.workspace.organizationId, userId: profile.userId }, select: { id: true } });
    if (!referralEligibility({ referrerUserId: profile.userId, invitedOwnerUserId: context.user.id,
      referrerBelongsToInvitedOrg: Boolean(sameOfficeMember), invitedOrganizationIsInternal: context.workspace.organizationSlug === "jurisportal-internal",
      invitedSubscriptionStatus: context.workspace.subscription?.status,
      alreadyAttributedTo: attribution?.referrerUserId ?? null, cycle: parsed.data.cycle,
    }) || attribution?.firstPaidAt || attribution?.revokedAt) return NextResponse.json({ error: "PROMOTION_NOT_APPLICABLE" }, { status: 400 });
    return NextResponse.json({ label: "Indique e ganhe", percent: 10, kind: "referral", ...quoteFirstPayment(base, 10),
      cycle: parsed.data.cycle, planSlug: plan.slug,
      message: "10% somente na primeira mensalidade. Convite ainda não representa pagamento.",
    }, { headers: { "Cache-Control": "no-store" } });
  }
  // Cupons de migração e convites não podem acumular na mesma primeira cobrança.
  if (attribution) return NextResponse.json({ error: "PROMOTION_NOT_APPLICABLE" }, { status: 400 });
  const record = await prisma.promotionCode.findUnique({ where: { codeHash: promotionCodeHash(normalized!) },
    select: { organizationId:true,campaign:true,discountPercent:true,expiresAt:true,redeemedAt:true,revokedAt:true } });
  if (!record || !migrationDiscountEligibility({
    organizationMatches: record.organizationId === context.workspace.organizationId,
    campaign: record.campaign, expiresAt: record.expiresAt, redeemedAt: record.redeemedAt,
    revokedAt: record.revokedAt, subscriptionStatus: context.workspace.subscription?.status,
    cycle: parsed.data.cycle,
  })) return NextResponse.json({ error: "PROMOTION_NOT_APPLICABLE" }, { status: 400 });
  return NextResponse.json({
    label: "Migração do Jurisportal legado", percent: record.discountPercent, kind: "migration",
    ...quoteFirstPayment(base, record.discountPercent),
    cycle: parsed.data.cycle, planSlug: plan.slug,
    message: "Desconto apenas na primeira cobrança. Aplicação definitiva depende da confirmação de pagamento.",
  }, { headers: { "Cache-Control": "no-store" } });
}

import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { normalizedReferralCode } from "@/modules/promotions/infrastructure/referral-code";
import { referralEligibility } from "@/modules/promotions/domain/referrals";

export const runtime = "nodejs";
const body = z.object({ code: z.string().trim().max(100), cycle: z.literal("monthly") }).strict();

/** Registra o escritório indicado; não confirma pagamento nem concede benefício. */
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const ctx = await getAppContext();
  if (!ctx.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (ctx.workspace.role !== "owner") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const code = normalizedReferralCode(parsed.data.code);
  if (!code) return NextResponse.json({ error: "REFERRAL_NOT_APPLICABLE" }, { status: 400 });
  const profile = await prisma.referralProfile.findUnique({ where: { code }, select: { userId: true } });
  if (!profile) return NextResponse.json({ error: "REFERRAL_NOT_APPLICABLE" }, { status: 400 });
  const [sameOfficeMember, existing] = await Promise.all([
    prisma.member.findFirst({ where: { organizationId: ctx.workspace.organizationId, userId: profile.userId }, select: { id: true } }),
    prisma.referralAttribution.findUnique({ where: { invitedOrganizationId: ctx.workspace.organizationId }, select: { referrerUserId: true, firstPaidAt: true, revokedAt: true } }),
  ]);
  if (!referralEligibility({
    referrerUserId: profile.userId, invitedOwnerUserId: ctx.user.id,
    referrerBelongsToInvitedOrg: Boolean(sameOfficeMember),
    invitedOrganizationIsInternal: ctx.workspace.organizationSlug === "jurisportal-internal",
    invitedSubscriptionStatus: ctx.workspace.subscription?.status,
    alreadyAttributedTo: existing?.referrerUserId ?? null,
    cycle: "monthly",
  }) || existing?.revokedAt || existing?.firstPaidAt) return NextResponse.json({ error: "REFERRAL_NOT_APPLICABLE" }, { status: 400 });
  if (existing) return NextResponse.json({ status: "AWAITING_PAYMENT", message: "Convite já registrado. Desconto condicionado à primeira mensalidade confirmada." });
  try {
    await prisma.$transaction(async (tx) => {
      await tx.referralAttribution.create({ data: {
        invitedOrganizationId: ctx.workspace.organizationId, referrerUserId: profile.userId,
      } });
      await tx.auditEvent.create({ data: { organizationId: ctx.workspace.organizationId, actorUserId: ctx.user.id,
        category: "billing", action: "referral.claimed", entityType: "organization", entityId: ctx.workspace.organizationId,
        metadata: { campaign: "REFERRAL", percent: 10, referrerUserId: profile.userId, paymentConfirmed: false },
      } });
    });
  } catch {
    // Unique(invitedOrganizationId) bloqueia atribuições duplicadas e corridas entre códigos distintos.
    return NextResponse.json({ error: "REFERRAL_NOT_APPLICABLE" }, { status: 409 });
  }
  return NextResponse.json({ status: "AWAITING_PAYMENT", message: "Convite registrado. Nenhum pagamento ou benefício foi concedido." }, { status: 201 });
}

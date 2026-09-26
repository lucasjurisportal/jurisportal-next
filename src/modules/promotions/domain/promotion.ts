import type { BillingCycle } from "@/modules/plans/domain/plan.types";

/** Não usar desconto flutuante no banco: os valores são calculados em centavos. */
export function quoteFirstPayment(amountReais: number, percent = 20) {
  if (!Number.isFinite(amountReais) || amountReais < 0 || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    throw new Error("INVALID_PROMOTION_AMOUNT");
  }
  const originalCents = Math.round(amountReais * 100);
  const discountCents = Math.round((originalCents * percent) / 100);
  return {
    originalCents,
    discountCents,
    firstPaymentCents: originalCents - discountCents,
    nextPaymentCents: originalCents,
  };
}

/** Só a 1ª cobrança da modalidade selecionada pode receber a promoção. */
export function migrationDiscountEligibility(input: {
  organizationMatches: boolean;
  campaign: string;
  expiresAt: Date;
  redeemedAt: Date | null;
  revokedAt: Date | null;
  subscriptionStatus?: string | null;
  cycle: BillingCycle;
  now?: Date;
}) {
  return input.organizationMatches && input.campaign === "LEGACY_MIGRATION"
    && input.expiresAt.getTime() > (input.now ?? new Date()).getTime()
    && !input.redeemedAt && !input.revokedAt
    && input.subscriptionStatus !== "active" && input.subscriptionStatus !== "internal"
    && (input.cycle === "monthly" || input.cycle === "annual");
}

export function pilotEntitlement(input: {
  status?: string | null;
  pilot: { planSlug: string; expiresAt: Date; revokedAt: Date | null } | null;
  validPlanSlugs: readonly string[];
  now?: Date;
}) {
  if (input.status === "active" || input.status === "internal" || !input.pilot || input.pilot.revokedAt) return null;
  return input.pilot.expiresAt.getTime() > (input.now ?? new Date()).getTime()
    && input.validPlanSlugs.includes(input.pilot.planSlug) && input.pilot.planSlug !== "free"
    ? input.pilot.planSlug : null;
}

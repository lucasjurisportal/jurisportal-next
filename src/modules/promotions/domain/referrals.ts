/** Programa de indicação: convite não é pagamento e pagamento não é prêmio adquirido. */
export const REFERRAL_FIRST_MONTH_PERCENT = 10;
export const REFERRAL_FREE_MONTH_THRESHOLD = 3;
export const REFERRAL_CASH_THRESHOLD = 5;
export const REFERRAL_BONUS_PER_PAID_MONTHLY_CENTS = 3000;
export const REFERRAL_HOLD_DAYS = 28;
export const REFERRAL_REWARD_PLAN = "premium";

export type ReferralEligibility = {
  referrerUserId: string;
  invitedOwnerUserId: string;
  referrerBelongsToInvitedOrg: boolean;
  invitedOrganizationIsInternal: boolean;
  invitedSubscriptionStatus?: string | null;
  alreadyAttributedTo?: string | null;
  cycle: "monthly" | "annual";
};

export function referralEligibility(input: ReferralEligibility): boolean {
  return input.cycle === "monthly"
    && !input.referrerBelongsToInvitedOrg
    && input.referrerUserId !== input.invitedOwnerUserId
    && !input.invitedOrganizationIsInternal
    && (input.alreadyAttributedTo == null || input.alreadyAttributedTo === input.referrerUserId)
    && (input.invitedSubscriptionStatus == null || ["pending_verification", "pending_payment", "trialing"].includes(input.invitedSubscriptionStatus));
}

/**
 * O marcador QUALIFIED só poderá ser gravado pelo conciliador financeiro futuro:
 * pagamento comprovado, 28 dias de permanência, sem cancelamento, estorno ou chargeback.
 * A checagem adicional aqui impede que um marcador desatualizado conte como prêmio.
 * Não concede mês grátis, desconto ou repasse de forma automática.
 */
export type ReferralRewardEvidence = {
  firstPaidAt: Date | null;
  status: string;
  revokedAt: Date | null;
  billingCycle: string | null;
  subscriptionStatus: string | null;
  canceledAt: Date | null;
};

export function qualifiesReferralForReward(input: ReferralRewardEvidence, now: Date): boolean {
  if (!input.firstPaidAt || input.revokedAt || input.canceledAt || input.status !== "QUALIFIED") return false;
  if (input.billingCycle !== "monthly" || input.subscriptionStatus !== "active") return false;
  if (Number.isNaN(input.firstPaidAt.getTime()) || Number.isNaN(now.getTime())) return false;
  return now.getTime() - input.firstPaidAt.getTime() >= REFERRAL_HOLD_DAYS * 24 * 60 * 60 * 1000;
}

export function premiumMonthlyRewardAllowed(input: {
  planSlug: string | null | undefined;
  billingCycle: string | null | undefined;
  subscriptionStatus: string | null | undefined;
  canceledAt: Date | null | undefined;
}): boolean {
  return input.planSlug === REFERRAL_REWARD_PLAN && input.billingCycle === "monthly"
    && input.subscriptionStatus === "active" && !input.canceledAt;
}

export function referralProgress(confirmedFirstPayments: number, eligiblePlan = false) {
  if (!Number.isInteger(confirmedFirstPayments) || confirmedFirstPayments < 0) throw new Error("INVALID_REFERRAL_COUNT");
  return {
    confirmedFirstPayments,
    // Benefícios são faixas EXCLUSIVAS: aos cinco indicados passa ao programa em dinheiro.
    // Não cria nem mantém nova elegibilidade de mês gratuito na faixa de remuneração.
    freeMonthEligible: eligiblePlan
      && confirmedFirstPayments >= REFERRAL_FREE_MONTH_THRESHOLD
      && confirmedFirstPayments < REFERRAL_CASH_THRESHOLD,
    // Direito a participar da apuração, NÃO transferência automática.
    cashProgramEligible: confirmedFirstPayments >= REFERRAL_CASH_THRESHOLD,
    remainingUntilFreeMonth: confirmedFirstPayments >= REFERRAL_CASH_THRESHOLD ? 0 : Math.max(0, REFERRAL_FREE_MONTH_THRESHOLD - confirmedFirstPayments),
    remainingUntilCash: Math.max(0, REFERRAL_CASH_THRESHOLD - confirmedFirstPayments),
  };
}

/** Cota fixa por mensalidade qualificada, não percentual sobre o preço do plano. */
export function referralCommissionPreview(eligibleMonthlyPayments: number): number {
  if (!Number.isSafeInteger(eligibleMonthlyPayments) || eligibleMonthlyPayments < 0) throw new Error("INVALID_REFERRAL_COUNT");
  return eligibleMonthlyPayments * REFERRAL_BONUS_PER_PAID_MONTHLY_CENTS;
}

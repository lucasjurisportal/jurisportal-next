import { REFERRAL_BONUS_PER_PAID_MONTHLY_CENTS, REFERRAL_CASH_THRESHOLD } from "./referrals";

/** O contador da competência segue a data civil de São Paulo, não o UTC do servidor. */
export function saoPauloMonthKey(now: Date): string {
  if (Number.isNaN(now.getTime())) throw new Error("INVALID_DATE");
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit" }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("INVALID_DATE");
  return `${year}-${month}`;
}

export type BonusEntry = {
  invitedOrganizationId: string;
  competenceMonth: string; // YYYY-MM, competência do pagamento mensal de fato recebido.
  amountCents: number;
  status: string; // PENDING_REVIEW, QUALIFIED, PAID, REVERSED
  eligibleAt: Date | null; // calculado pelo conciliador: >=28d e no mínimo primeiro dia do próximo mês.
  reversedAt: Date | null;
  activeMonthly: boolean; // assinatura do indicado ATUAL, para não repassar mensalidade cancelada.
};

/**
 * Resumo SEM qualquer efeito financeiro:
 * - cada mês mostra sua projeção, recomeçando em 0 no mês novo;
 * - no início do mês seguinte, valores já maduros podem compor saldo pendente;
 * - maturação tardia continua registrada e pode entrar em apuração posterior;
 * - o histórico de repasses nunca é zerado nem reembolsado automaticamente.
 */
export function monthlyReferralBonus(input: {
  qualifiedReferrals: number;
  month: string;
  entries: BonusEntry[];
  now: Date;
}) {
  if (!Number.isSafeInteger(input.qualifiedReferrals) || input.qualifiedReferrals < 0) throw new Error("INVALID_REFERRAL_COUNT");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) || Number.isNaN(input.now.getTime())) throw new Error("INVALID_PERIOD");
  const unlocked = input.qualifiedReferrals >= REFERRAL_CASH_THRESHOLD;
  const seen = new Set<string>();
  let monthlyPayments = 0;
  let pendingReview = 0;
  let eligibleToSettle = 0;
  let alreadyPaidCents = 0;
  for (const entry of input.entries) {
    if (entry.competenceMonth > input.month || entry.reversedAt || entry.status === "REVERSED") continue;
    const identity = `${entry.invitedOrganizationId}:${entry.competenceMonth}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    if (entry.amountCents !== REFERRAL_BONUS_PER_PAID_MONTHLY_CENTS) throw new Error("INVALID_COMMISSION_AMOUNT");
    const isCurrent = entry.competenceMonth === input.month;
    if (entry.status === "PAID") {
      alreadyPaidCents += entry.amountCents;
      if (isCurrent) monthlyPayments += 1;
      continue;
    }
    if (!entry.activeMonthly) continue;
    if (entry.status === "PENDING_REVIEW") {
      if (isCurrent) { monthlyPayments += 1; pendingReview += 1; }
      continue;
    }
    if (entry.status !== "QUALIFIED") continue;
    if (isCurrent) monthlyPayments += 1;
    // Nunca paga na mesma competência, mesmo que a carência tenha terminado antecipadamente.
    if (entry.competenceMonth < input.month && entry.eligibleAt && entry.eligibleAt <= input.now) eligibleToSettle += 1;
  }
  return {
    unlocked,
    remainingToUnlock: Math.max(0, REFERRAL_CASH_THRESHOLD - input.qualifiedReferrals),
    monthlyPayments: unlocked ? monthlyPayments : 0,
    estimatedCents: unlocked ? monthlyPayments * REFERRAL_BONUS_PER_PAID_MONTHLY_CENTS : 0,
    alreadyPaidCents: unlocked ? alreadyPaidCents : 0,
    pendingCents: unlocked ? eligibleToSettle * REFERRAL_BONUS_PER_PAID_MONTHLY_CENTS : 0,
    pendingReview,
  };
}

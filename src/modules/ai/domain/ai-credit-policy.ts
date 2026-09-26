import { AI_MONTHLY_UNIT_LIMIT, type AiAction } from "./ai-policy";
import type { PlanSlug } from "../../plans/domain/plan.types";

export type AiCreditStatus = "RESERVED" | "SETTLED" | "RELEASED" | "EXPIRED" | "REFUNDED";
export type AiCreditRecord = {
  status: string; // refletido do banco (CHECK SQL restringe valores a AiCreditStatus)
  reservedCredits: number;
  chargedCredits: number;
  expiresAt: Date;
};
export type AiCreditBalance = {
  periodKey: string;
  monthlyLimit: number;
  used: number;
  reserved: number;
  available: number;
};

export const AI_ACTION_CAPABILITY: Readonly<Record<AiAction, `ai.${AiAction}`>> = {
  publicationSummary: "ai.publicationSummary",
  explicitDateExtraction: "ai.explicitDateExtraction",
  clientUpdate: "ai.clientUpdate",
  managementSummary: "ai.managementSummary",
};

/** Sempre pela competência de São Paulo, não pela data UTC do servidor ou navegador. */
export function aiPeriodKey(now = new Date()) {
  const items = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit",
  }).formatToParts(now);
  const year = items.find((part) => part.type === "year")?.value;
  const month = items.find((part) => part.type === "month")?.value;
  if (!year || !month) throw new Error("AI_PERIOD_INVALID");
  return `${year}-${month}`;
}

export function assertCreditQuantity(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new Error("AI_CREDITS_INVALID");
}

export function calculateAiCreditBalance(input: {
  planSlug: PlanSlug;
  periodKey: string;
  records: readonly AiCreditRecord[];
  now: Date;
}): AiCreditBalance {
  const monthlyLimit = AI_MONTHLY_UNIT_LIMIT[input.planSlug];
  let used = 0;
  let reserved = 0;
  for (const record of input.records) {
    if (record.status === "SETTLED") used += record.chargedCredits;
    else if (record.status === "RESERVED" && record.expiresAt.getTime() > input.now.getTime()) {
      reserved += record.reservedCredits;
    }
  }
  return {
    periodKey: input.periodKey,
    monthlyLimit,
    used,
    reserved,
    available: Math.max(0, monthlyLimit - used - reserved),
  };
}

export function assertAiReservationAllowed(balance: AiCreditBalance, maxCredits: number) {
  assertCreditQuantity(maxCredits);
  if (balance.monthlyLimit === 0) throw new Error("AI_PLAN_UNAVAILABLE");
  if (balance.available < maxCredits) throw new Error("AI_CREDITS_INSUFFICIENT");
}

import { LAUNCH_PROMOTION_END_DATE } from "../domain/plan.catalog";
import type {
  BillingCycle,
  CommercialPeriod,
  PlanDefinition,
} from "../domain/plan.types";

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";

function saoPauloDateKey(at: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Não foi possível determinar a data comercial do Jurisportal.");
  }

  return `${year}-${month}-${day}`;
}

export function getCommercialPeriod(at = new Date()): CommercialPeriod {
  return saoPauloDateKey(at) <= LAUNCH_PROMOTION_END_DATE ? "launch" : "standard";
}

export function getMonthlyPrice(plan: PlanDefinition, at = new Date()): number {
  return getCommercialPeriod(at) === "launch"
    ? plan.pricing.launchMonthly
    : plan.pricing.standardMonthly;
}

export function getAnnualPrice(plan: PlanDefinition, at = new Date()): number {
  const monthly = getMonthlyPrice(plan, at);
  if (monthly === 0) return 0;
  return Math.round(monthly * plan.pricing.annualMonthsCharged * 100) / 100;
}

export function getDisplayedMonthlyPrice(
  plan: PlanDefinition,
  cycle: BillingCycle,
  at = new Date(),
): number {
  if (cycle === "monthly") return getMonthlyPrice(plan, at);
  const annual = getAnnualPrice(plan, at);
  return annual === 0 ? 0 : Math.round((annual / 12) * 100) / 100;
}

export function annualSavingsPercent(plan: PlanDefinition): number {
  if (plan.pricing.annualMonthsCharged <= 0) return 0;
  return (
    Math.round((1 - plan.pricing.annualMonthsCharged / 12) * 1000) / 10
  );
}

export function currency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

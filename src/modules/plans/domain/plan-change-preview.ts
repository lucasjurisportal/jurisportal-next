import type { PlanDefinition, PlanSlug } from "./plan.types";
import { AI_MONTHLY_UNIT_LIMIT } from "../../ai/domain/ai-policy";

/** Apenas simulação visual: NÃO autoriza alteração de assinatura ou exclusão de processos. */
export const PLANNED_AI_MONTHLY_CREDITS: Readonly<Record<PlanSlug, number>> = AI_MONTHLY_UNIT_LIMIT;

export function planChangePreview(plans: readonly PlanDefinition[], currentSlug: PlanSlug, targetSlug: PlanSlug, processCount: number) {
  const currentIndex = plans.findIndex((item) => item.slug === currentSlug);
  const targetIndex = plans.findIndex((item) => item.slug === targetSlug);
  if (currentIndex < 0 || targetIndex < 0 || !Number.isInteger(processCount) || processCount < 0)
    throw new Error("INVALID_PLAN_PREVIEW");
  const target = plans[targetIndex];
  const excessProcesses = target.registeredProcessLimit === "unlimited" ? 0 : Math.max(0, processCount - target.registeredProcessLimit);
  return { direction: targetIndex > currentIndex ? "upgrade" as const : targetIndex < currentIndex ? "downgrade" as const : "same" as const,
    excessProcesses, requiresReview: targetIndex < currentIndex && excessProcesses > 0 };
}

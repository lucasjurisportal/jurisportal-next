import type { PlanDefinition, PlanSlug } from "./plan.types";

/** Apenas simulação visual: NÃO autoriza alteração de assinatura ou exclusão de processos. */
export const PLANNED_AI_MONTHLY_CREDITS: Readonly<Record<PlanSlug, number>> = {
  free: 0, essencial: 0, estrategico: 100, premium: 500, executivo: 2000, "alta-corte": 5000,
};

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

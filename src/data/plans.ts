/**
 * Camada de compatibilidade para os componentes visuais existentes.
 *
 * A fonte de verdade comercial está em `src/modules/plans/`.
 * Componentes novos devem importar diretamente do módulo de planos.
 */
export { planCatalog as plans } from "@/modules/plans/domain/plan.catalog";
export type { BillingCycle, PlanDefinition as Plan, PlanSlug } from "@/modules/plans/domain/plan.types";
export {
  annualSavingsPercent,
  currency,
  getAnnualPrice,
  getCommercialPeriod,
  getDisplayedMonthlyPrice,
  getMonthlyPrice,
} from "@/modules/plans/application/plan-pricing";

import { planCatalog } from "@/modules/plans/domain/plan.catalog";

export const paidPlans = planCatalog.filter((plan) => plan.slug !== "free");
export const freePlan = planCatalog.find((plan) => plan.slug === "free")!;

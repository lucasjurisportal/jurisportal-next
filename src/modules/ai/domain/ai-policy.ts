import type { PlanSlug } from "../../plans/domain/plan.types";

/**
 * Unidade interna de IA.
 * Valores fixos legados são pesos de protótipo, NÃO preço definitivo das ações.
 * A reserva real recebe custo estimado definido pelo serviço da tarefa. 
 */
export type AiAction =
  | "publicationSummary"
  | "explicitDateExtraction"
  | "clientUpdate"
  | "managementSummary";

export const AI_ACTION_UNIT_COST: Readonly<Record<AiAction, number>> = {
  publicationSummary: 1,
  explicitDateExtraction: 1,
  clientUpdate: 3,
  managementSummary: 2,
};

/**
 * Franquia mensal comercial planejada. Sem execução de modelo até homologar o provedor.
 * Créditos são unidades do Jurisportal, não tokens do provedor.
 */
export const AI_MONTHLY_UNIT_LIMIT: Readonly<Record<PlanSlug, number>> = {
  free: 0,
  essencial: 0,
  estrategico: 100,
  premium: 500,
  executivo: 2000,
  "alta-corte": 5000,
};

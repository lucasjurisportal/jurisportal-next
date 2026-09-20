import type { PlanSlug } from "../../plans/domain/plan.types";

/**
 * Unidade interna de IA.
 * Não é apresentada ao cliente como "token" ou "crédito" nesta fase.
 * Serve para controlar custo e impedir consumo ilimitado acidental.
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
 * Limites internos iniciais acordados.
 * Free, Essencial e Estratégico não consomem IA.
 * Esses números são proteção financeira e podem ser revistos depois de medirmos uso real.
 */
export const AI_MONTHLY_UNIT_LIMIT: Readonly<Record<PlanSlug, number>> = {
  free: 0,
  essencial: 0,
  estrategico: 0,
  premium: 500,
  executivo: 2500,
  "alta-corte": 10000,
};

import type { PlanSlug } from "@/modules/plans/domain/plan.types";

export type AiProviderConfig = {
  enabled: boolean;
  apiKey: string | null;
  lunaModel: string | null;
  terraModel: string | null;
};

export function readAiProviderConfig(env: NodeJS.ProcessEnv = process.env): AiProviderConfig {
  return {
    enabled: env.AI_PROVIDER_ENABLED === "true",
    apiKey: env.OPENAI_API_KEY?.trim() || null,
    lunaModel: env.OPENAI_MODEL_LUNA?.trim() || null,
    terraModel: env.OPENAI_MODEL_TERRA?.trim() || null,
  };
}

export function modelForPlan(planSlug: PlanSlug, config: AiProviderConfig) {
  if (planSlug === "alta-corte") {
    if (!config.terraModel) throw new Error("AI_MODEL_TERRA_NOT_CONFIGURED");
    return config.terraModel;
  }
  if (!config.lunaModel) throw new Error("AI_MODEL_LUNA_NOT_CONFIGURED");
  return config.lunaModel;
}

export function assertAiProviderConfigured(config: AiProviderConfig) {
  if (!config.enabled) throw new Error("AI_PROVIDER_DISABLED");
  if (!config.apiKey) throw new Error("AI_PROVIDER_NOT_CONFIGURED");
}

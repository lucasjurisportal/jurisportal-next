import { prisma } from "@/infrastructure/database/prisma";
import type { PlanSlug } from "@/modules/plans/domain/plan.types";
import { planHasCapability } from "@/modules/plans/application/plan-entitlements";
import {
  getAiCreditBalance,
  releaseAiCredits,
  reserveAiCredits,
  settleAiCredits,
} from "./ai-credit-service";
import {
  calculatePublicationSummaryCharge,
  estimatePublicationSummaryCredits,
  publicationSummarySchema,
  PUBLICATION_SUMMARY_PROMPT_VERSION,
  trimPublicationForAi,
  type PublicationSummaryResult,
} from "../domain/publication-summary";
import { assertAiProviderConfigured, modelForPlan, readAiProviderConfig } from "../infrastructure/ai-provider-config";
import { OpenAiResponsesProvider } from "../infrastructure/openai-responses-provider";

export type StoredPublicationSummary = {
  id: string;
  result: PublicationSummaryResult;
  model: string;
  chargedCredits: number;
  createdAt: string;
};

function storedGeneration(generation: {
  id: string;
  output: unknown;
  model: string;
  chargedCredits: number;
  createdAt: Date;
}): StoredPublicationSummary | null {
  const parsed = publicationSummarySchema.safeParse(generation.output);
  if (!parsed.success) return null;
  return {
    id: generation.id,
    result: parsed.data,
    model: generation.model,
    chargedCredits: generation.chargedCredits,
    createdAt: generation.createdAt.toISOString(),
  };
}

export async function getLatestPublicationSummary(organizationId: string, publicationId: string) {
  const publication = await prisma.publication.findFirst({
    where: { id: publicationId, organizationId },
    select: { id: true },
  });
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  const generation = await prisma.aiGeneration.findFirst({
    where: {
      organizationId,
      publicationId,
      action: "publicationSummary",
      status: "COMPLETED",
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, output: true, model: true, chargedCredits: true, createdAt: true },
  });
  return generation ? storedGeneration(generation) : null;
}

export async function runPublicationSummary(input: {
  organizationId: string;
  actorUserId: string;
  planSlug: PlanSlug;
  publicationId: string;
  requestKey: string;
}) {
  if (!planHasCapability(input.planSlug, "ai.publicationSummary")) throw new Error("AI_ACTION_NOT_INCLUDED");
  if (!/^pubsum:[A-Za-z0-9_-]{20,90}$/.test(input.requestKey)) throw new Error("AI_REQUEST_KEY_INVALID");

  const existing = await prisma.aiGeneration.findUnique({
    where: { organizationId_requestKey: { organizationId: input.organizationId, requestKey: input.requestKey } },
    select: {
      id: true, actorUserId: true, publicationId: true, action: true, status: true,
      output: true, model: true, chargedCredits: true, createdAt: true,
    },
  });
  if (existing) {
    if (existing.actorUserId !== input.actorUserId || existing.publicationId !== input.publicationId || existing.action !== "publicationSummary") {
      throw new Error("AI_REQUEST_KEY_CONFLICT");
    }
    if (existing.status === "COMPLETED") {
      const stored = storedGeneration(existing);
      if (stored) return { summary: stored, balance: await getAiCreditBalance(input.organizationId, input.planSlug) };
    }
    throw new Error("AI_REQUEST_ALREADY_CLOSED");
  }

  const publication = await prisma.publication.findFirst({
    where: { id: input.publicationId, organizationId: input.organizationId },
    select: {
      id: true,
      content: true,
      court: true,
      judicialBody: true,
      communicationType: true,
      processNumberFormatted: true,
      processNumberRaw: true,
    },
  });
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  if (!publication.content.trim()) throw new Error("PUBLICATION_CONTENT_EMPTY");

  const config = readAiProviderConfig();
  assertAiProviderConfigured(config);
  const model = modelForPlan(input.planSlug, config);
  const content = trimPublicationForAi(publication.content);
  const reservedCredits = estimatePublicationSummaryCredits(content);

  await reserveAiCredits({
    organizationId: input.organizationId,
    actorUserId: input.actorUserId,
    planSlug: input.planSlug,
    action: "publicationSummary",
    requestKey: input.requestKey,
    maxCredits: reservedCredits,
  });

  let generationId: string | null = null;
  let settled = false;
  try {
    const generation = await prisma.aiGeneration.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        publicationId: publication.id,
        requestKey: input.requestKey,
        action: "publicationSummary",
        provider: "openai-responses",
        model,
        promptVersion: PUBLICATION_SUMMARY_PROMPT_VERSION,
        status: "PENDING",
        estimatedCredits: reservedCredits,
      },
      select: { id: true },
    });
    generationId = generation.id;

    const provider = new OpenAiResponsesProvider(config.apiKey!);
    const providerOutput = await provider.summarizePublication({
      model,
      publicationText: content,
      metadata: {
        court: publication.court,
        judicialBody: publication.judicialBody,
        communicationType: publication.communicationType,
        processNumber: publication.processNumberFormatted ?? publication.processNumberRaw,
      },
    });
    const chargedCredits = calculatePublicationSummaryCharge({
      reservedCredits,
      inputTokens: providerOutput.usage.inputTokens,
      outputTokens: providerOutput.usage.outputTokens,
    });
    await settleAiCredits({ organizationId: input.organizationId, requestKey: input.requestKey, chargedCredits });
    settled = true;

    const completed = await prisma.aiGeneration.update({
      where: { id: generation.id },
      data: {
        status: "COMPLETED",
        provider: providerOutput.provider,
        model: providerOutput.model,
        providerResponseId: providerOutput.responseId,
        chargedCredits,
        inputTokens: providerOutput.usage.inputTokens,
        outputTokens: providerOutput.usage.outputTokens,
        output: providerOutput.result,
        completedAt: new Date(),
      },
      select: { id: true, output: true, model: true, chargedCredits: true, createdAt: true },
    });
    const stored = storedGeneration(completed);
    if (!stored) throw new Error("AI_RESULT_PERSISTENCE_INVALID");
    return { summary: stored, balance: await getAiCreditBalance(input.organizationId, input.planSlug) };
  } catch (cause) {
    const errorCode = cause instanceof Error ? cause.message.slice(0, 180) : "AI_UNKNOWN_ERROR";
    if (!settled) {
      await releaseAiCredits({
        organizationId: input.organizationId,
        requestKey: input.requestKey,
        reason: errorCode,
      }).catch(() => null);
    }
    if (generationId) {
      await prisma.aiGeneration.update({
        where: { id: generationId },
        data: { status: "FAILED", failureCode: errorCode, completedAt: new Date() },
      }).catch(() => null);
    }
    throw cause;
  }
}

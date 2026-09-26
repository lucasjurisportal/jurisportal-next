import { z } from "zod";

export const PUBLICATION_SUMMARY_PROMPT_VERSION = "publication-summary-v1";
export const PUBLICATION_SUMMARY_MAX_CREDITS = 10;
export const PUBLICATION_SUMMARY_MAX_INPUT_CHARS = 30_000;

export const publicationSummarySchema = z.object({
  summary: z.string().trim().min(1).max(1_800),
  keyFacts: z.array(z.string().trim().min(1).max(320)).max(6),
  datesMentioned: z.array(z.object({
    text: z.string().trim().min(1).max(80),
    context: z.string().trim().min(1).max(320),
  })).max(8),
  warnings: z.array(z.string().trim().min(1).max(320)).max(5),
  uncertainties: z.array(z.string().trim().min(1).max(320)).max(5),
});

export type PublicationSummaryResult = z.infer<typeof publicationSummarySchema>;

/**
 * Reserva conservadora para resumo curto de publicação. O valor final é recalculado
 * com o uso informado pelo provedor, sempre respeitando o teto de 10 créditos.
 */
export function estimatePublicationSummaryCredits(content: string) {
  const chars = Math.min(PUBLICATION_SUMMARY_MAX_INPUT_CHARS, content.trim().length);
  if (!chars) return 2;
  return Math.min(PUBLICATION_SUMMARY_MAX_CREDITS, Math.max(2, 2 + Math.ceil(chars / 6_000)));
}

export function calculatePublicationSummaryCharge(input: {
  reservedCredits: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
}) {
  const inputTokens = Math.max(0, input.inputTokens ?? 0);
  const outputTokens = Math.max(0, input.outputTokens ?? 0);
  // Unidade interna do Jurisportal; não equivale a token. Será recalibrada com o beta.
  const metered = 1 + Math.ceil(inputTokens / 2_500) + Math.ceil(outputTokens / 600);
  return Math.min(input.reservedCredits, Math.max(2, metered));
}

export function trimPublicationForAi(content: string) {
  return content.trim().slice(0, PUBLICATION_SUMMARY_MAX_INPUT_CHARS);
}

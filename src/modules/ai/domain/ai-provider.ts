import type { PublicationSummaryResult } from "./publication-summary";

export type AiProviderUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
};

export type PublicationSummaryProviderInput = {
  model: string;
  publicationText: string;
  metadata: {
    court: string | null;
    judicialBody: string | null;
    communicationType: string;
    processNumber: string | null;
  };
};

export type PublicationSummaryProviderOutput = {
  result: PublicationSummaryResult;
  provider: string;
  model: string;
  responseId: string | null;
  usage: AiProviderUsage;
};

export interface AiProvider {
  summarizePublication(input: PublicationSummaryProviderInput): Promise<PublicationSummaryProviderOutput>;
}

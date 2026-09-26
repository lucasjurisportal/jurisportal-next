import assert from "node:assert/strict";
import test from "node:test";
import {
  calculatePublicationSummaryCharge,
  estimatePublicationSummaryCredits,
  publicationSummarySchema,
  trimPublicationForAi,
  PUBLICATION_SUMMARY_MAX_INPUT_CHARS,
} from "./publication-summary";

test("resumo curto reserva poucos créditos e nunca excede teto", () => {
  assert.equal(estimatePublicationSummaryCredits("texto curto"), 3);
  assert.ok(estimatePublicationSummaryCredits("x".repeat(100_000)) <= 10);
});

test("custo efetivo respeita a reserva", () => {
  assert.equal(calculatePublicationSummaryCharge({ reservedCredits: 4, inputTokens: 10_000, outputTokens: 2_000 }), 4);
  assert.equal(calculatePublicationSummaryCharge({ reservedCredits: 7, inputTokens: 800, outputTokens: 200 }), 3);
});

test("entrada do provedor é limitada", () => {
  assert.equal(trimPublicationForAi(" x ".repeat(50_000)).length, PUBLICATION_SUMMARY_MAX_INPUT_CHARS);
});

test("schema rejeita saída sem resumo", () => {
  assert.equal(publicationSummarySchema.safeParse({ keyFacts: [], datesMentioned: [], warnings: [], uncertainties: [] }).success, false);
  assert.equal(publicationSummarySchema.safeParse({ summary: "Síntese.", keyFacts: [], datesMentioned: [], warnings: [], uncertainties: [] }).success, true);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createPetitionPdf } from "./petition-pdf";

test("gera PDF A4 válido sem marca do Jurisportal no conteúdo", () => {
  const pdf = createPetitionPdf("EXCELENTÍSSIMO SENHOR JUIZ\n\nJoão da Silva requer juntada.");
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  assert.match(pdf.toString("latin1"), /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.doesNotMatch(pdf.toString("latin1"), /Jurisportal/);
});

test("PDF multipágina preserva fontes e alinhamento do formato editável", async () => {
  const { encodeRichDocument } = await import("../domain/rich-document");
  const pdf = createPetitionPdf(encodeRichDocument({ version: 1, blocks: [
    { type: "heading", align: "center", runs: [{ text: "MANIFESTAÇÃO", bold: true }] },
    { type: "paragraph", align: "left", runs: [{ text: "João ", underline: true }, { text: "da Silva", italic: true }] },
    ...Array.from({ length: 90 }, () => ({ type: "paragraph" as const, align: "justify" as const, runs: [{ text: "Conteúdo jurídico revisado pelo advogado." }] })),
  ] }));
  const serialized = pdf.toString("latin1");
  assert.match(serialized, /Helvetica-Bold/);
  assert.match(serialized, /Helvetica-Oblique/);
  assert.match(serialized, /\/Count [2-9]/);
  assert.match(serialized, / m .* l S/);
});

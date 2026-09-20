import test from "node:test";
import assert from "node:assert/strict";
import { createPetitionPdf } from "./petition-pdf";

test("gera PDF A4 válido sem marca do Jurisportal no conteúdo", () => {
  const pdf = createPetitionPdf("EXCELENTÍSSIMO SENHOR JUIZ\n\nJoão da Silva requer juntada.");
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  assert.match(pdf.toString("latin1"), /\/MediaBox \[0 0 595\.28 841\.89\]/);
  assert.doesNotMatch(pdf.toString("latin1"), /Jurisportal/);
});

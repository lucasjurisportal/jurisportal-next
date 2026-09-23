import test from "node:test";
import assert from "node:assert/strict";
import { buildPublicationProcessPrefill } from "./publication-process-prefill";

test("pré-cadastra CNJ e partes, mas nunca escolhe cliente automaticamente", () => {
  const result = buildPublicationProcessPrefill({
    processNumberNormalized: "10008790820148260462",
    processNumberFormatted: "1000879-08.2014.8.26.0462",
    court: "TJSP", judicialBody: "2ª Vara",
    parties: [
      { name: " Parte autora ", role: "Polo ativo" },
      { name: "", role: "Polo passivo" },
      { name: "Parte ré", role: "Polo passivo" },
    ],
  }, "usuario-1", ["usuario-1"]);
  assert.equal(result?.cnj, "1000879-08.2014.8.26.0462");
  assert.equal(result?.primaryClientId, "");
  assert.equal(result?.responsibleUserId, "usuario-1");
  assert.deepEqual(result?.parties, [
    { name: "Parte autora", role: "Polo ativo", document: "" },
    { name: "Parte ré", role: "Polo passivo", document: "" },
  ]);
});

test("não sugere cadastro automático para CNJ ausente ou incompleto", () => {
  assert.equal(buildPublicationProcessPrefill(null, "id", []), undefined);
  assert.equal(buildPublicationProcessPrefill({
    processNumberNormalized: "1000", processNumberFormatted: "1000", court: null,
    judicialBody: null, parties: null,
  }, "id", []), undefined);
});

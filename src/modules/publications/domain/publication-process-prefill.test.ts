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

test("sugere classe, assunto, comarca, fórum e distribuição apenas se existirem na publicação", () => {
  const result = buildPublicationProcessPrefill({
    processNumberNormalized: "10008790820148260462", processNumberFormatted: null, court: "TJSP",
    judicialBody: "Vara Cível", parties: [], processMetadata: {
      district: "Poá", forum: "Fórum Cível de Poá", processClass: "Procedimento Comum Cível",
      subject: "Contratos", distributionDate: "2024-05-21",
    },
  }, "u", ["u"]);
  assert.equal(result?.district, "Poá");
  assert.equal(result?.forum, "Fórum Cível de Poá");
  assert.equal(result?.processClass, "Procedimento Comum Cível");
  assert.equal(result?.subject, "Contratos");
  assert.equal(result?.distributionDate, "2024-05-21");
});

test("sugere o titular da única OAB, nunca o proprietário por engano", () => {
  const source = { processNumberNormalized: "10008790820148260462", processNumberFormatted: null,
    court: "TJSP", judicialBody: null, parties: [], recipients: [{ lawyerOab: { userId: "auxiliar" } }] };
  assert.equal(buildPublicationProcessPrefill(source, "dono", ["dono", "auxiliar"])?.responsibleUserId, "auxiliar");
  assert.equal(buildPublicationProcessPrefill({ ...source, recipients: [...source.recipients, { lawyerOab: { userId: "dono" } }] }, "dono", ["dono", "auxiliar"])?.responsibleUserId, "");
});

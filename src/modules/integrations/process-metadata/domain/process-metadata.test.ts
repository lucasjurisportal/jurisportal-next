import assert from "node:assert/strict";
import test from "node:test";
import { courtAliasForCnj, normalizeDatajudProcess } from "./process-metadata";
const cnj = "10008790820148260462";
test("mapeia tribunal pelo ramo e código do CNJ e não pela OAB", () => {
  assert.equal(courtAliasForCnj(cnj), "tjsp");
  assert.equal(courtAliasForCnj("00000000020245010001"), "trf1");
  assert.equal(courtAliasForCnj("00000000020244020001"), "trt2");
  assert.equal(courtAliasForCnj("123"), null);
  assert.equal(courtAliasForCnj("00000000020246020001"), null);
});
test("extrai somente dados efetivos da fonte; ajuizamento não vira distribuição", () => {
  const result = normalizeDatajudProcess({ numeroProcesso: cnj, tribunal: "TJSP", grau: "G1",
    orgaoJulgador: { nome: "2ª Vara Cível", codigoMunicipioIBGE: 3539806 },
    classe: { nome: "Procedimento Comum Cível" }, assuntos: [{ nome: "Contratos", principal: true }],
    dataAjuizamento: "2014-05-09T10:22:00.000Z", movimentos: [{ codigo: 1 }],
  }, cnj);
  assert.equal(result?.division, "2ª Vara Cível");
  assert.equal(result?.subject, "Contratos");
  assert.equal(result?.district, null);
  assert.equal(result?.forum, null);
  assert.equal(result?.filingDate, "2014-05-09");
  assert.equal(result?.distributionDate, null);
  assert.equal(result?.movementsAvailable, 1);
});
test("não mistura processo diferente, dados ausentes ou assunto não principal ambíguo", () => {
  assert.equal(normalizeDatajudProcess({ numeroProcesso: "00000000020248260462" }, cnj), null);
  const result = normalizeDatajudProcess({ numeroProcesso: cnj, assuntos: [{ nome: "A" }, { nome: "B" }] }, cnj);
  assert.equal(result?.subject, null);
  assert.equal(result?.court, null);
});

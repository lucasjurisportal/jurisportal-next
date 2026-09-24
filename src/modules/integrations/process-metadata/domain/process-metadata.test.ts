import assert from "node:assert/strict";
import test from "node:test";
import { courtAliasForCnj, normalizeDatajudProcess, normalizeDatajudMovements } from "./process-metadata";
const cnj = "10008790820148260462";
test("mapeia tribunal pelo ramo e código do CNJ e não pela OAB", () => {
  assert.equal(courtAliasForCnj(cnj), "tjsp");
  assert.equal(courtAliasForCnj("00000000020244010001"), "trf1");
  assert.equal(courtAliasForCnj("00000000020245020001"), "trt2");
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
  assert.deepEqual(result?.otherSubjects, []);
  assert.equal(result?.district, null);
  assert.equal(result?.forum, null);
  assert.equal(result?.caseValue, null);
  assert.equal(result?.distributionDate, null);
  assert.equal(result?.movementsAvailable, 1);
});
test("não mistura processo diferente, dados ausentes ou assunto não principal ambíguo", () => {
  assert.equal(normalizeDatajudProcess({ numeroProcesso: "00000000020248260462" }, cnj), null);
  const result = normalizeDatajudProcess({ numeroProcesso: cnj, assuntos: [{ nome: "A" }, { nome: "B" }] }, cnj);
  assert.equal(result?.subject, null);
  assert.deepEqual(result?.otherSubjects, ["A", "B"]);
  assert.equal(result?.court, null);
});

test("interpreta sistema estruturado e preserva município IBGE como dado diferente de comarca", () => {
  const result = normalizeDatajudProcess({ numeroProcesso: cnj,
    sistema: { codigo: 4, nome: "EPROC" }, orgaoJulgador: { codigoMunicipioIBGE: 3539806 },
  }, cnj);
  assert.equal(result?.electronicSystem, "EPROC");
  assert.equal(result?.municipalityIbgeCode, 3539806);
  assert.equal(result?.district, null);
  assert.equal(result?.forum, null);
  assert.equal(result?.distributionDate, null);
});
test("interpreta movimentos sem inventar data e preserva entradas distintas", () => {
  const result = normalizeDatajudMovements({ movimentos: [
    { codigo: 123, nome: "Conclusos para despacho", dataHora: "20260923093100", orgaoJulgador: { nomeOrgao: "2ª Vara" } },
    { codigo: 123, nome: "Conclusos para despacho", dataHora: "data inválida" },
    { codigo: 58, nome: "Distribuição", dataHora: "2024-01-02T10:00:00.000Z" },
  ] }, 2);
  assert.equal(result.total, 3);
  assert.equal(result.truncated, true);
  assert.equal(result.items.length, 2);
  assert.equal(result.items.find((item) => item.occurredAt)?.judicialBody, "2ª Vara");
  assert.equal(result.items.every((item) => item.occurredAt !== null), true);
  // Uma entrada sem data ainda é preservada quando o limite permite.
  const complete = normalizeDatajudMovements({ movimentos: [
    { codigo: 123, nome: "Sem data", dataHora: "data inválida" },
  ] }, 2);
  assert.equal(complete.items[0]?.occurredAt, null);
});

test("valor e distribuição só vêm de campos explícitos e não de ajuizamento", () => {
  const result = normalizeDatajudProcess({ numeroProcesso: cnj,
    valorCausa: 2500.3, dataDistribuicao: "2017-07-05T10:00:00Z", dataAjuizamento: "2014-01-02",
  }, cnj);
  assert.equal(result?.caseValue, "2500.30");
  assert.equal(result?.distributionDate, "2017-07-05");
});

// A fonte pode devolver em ordem antiga primeiro; limitamos só após ordenar.
test("limite de movimentações preserva as mais recentes antes de truncar", () => {
  const items = Array.from({ length: 130 }, (_, i) => ({ codigo: 26, nome: `Movimento ${i}`,
    dataHora: new Date(Date.UTC(2024, 0, 1 + i)).toISOString() }));
  const result = normalizeDatajudMovements({ movimentos: items }, 100);
  assert.equal(result.total, 130);
  assert.equal(result.truncated, true);
  assert.equal(result.items.length, 100);
  assert.equal(result.items[0]?.name, "Movimento 129");
  assert.equal(result.items.at(-1)?.name, "Movimento 30");
});


test("não confunde área cível, classe da ação e assuntos TPU", () => {
  const result = normalizeDatajudProcess({ numeroProcesso: cnj,
    tribunal: "TJSP",
    classe: { codigo: 12154, nome: "Execução de Título Extrajudicial" },
    assuntos: [
      { codigo: 9580, nome: "Contratos Bancários", principal: true },
      { codigo: 100, nome: "Juros Remuneratórios" },
      { codigo: 101, nome: "Cobrança" },
      { codigo: 100, nome: "Juros Remuneratórios" },
    ],
  }, cnj);
  assert.equal(result?.processClass, "Execução de Título Extrajudicial");
  assert.equal(result?.subject, "Contratos Bancários");
  assert.deepEqual(result?.otherSubjects, ["Juros Remuneratórios", "Cobrança"]);
  assert.equal("caseType" in (result ?? {}), false); // nenhuma inferência de tipo pelo TJSP
});

import test from "node:test";
import assert from "node:assert/strict";
import { extractDjenProcessMetadata } from "./djen-process-metadata";

test("não inventa comarca ou fórum pelo CNJ ou pela unidade vaga", () => {
  assert.deepEqual(extractDjenProcessMetadata({ dataDisponibilizacao: "2026-09-23", dataAjuizamento: "2026-01-02" }, "Vara Cível de Poá"), {
    distributionDate: null, processClass: null, subject: null, district: null, forum: null,
  });
});
test("extrai somente campos identificados na fonte", () => {
  const value = extractDjenProcessMetadata({
    dataDistribuicao: "2025-06-01", classe: { nome: "Procedimento Comum Cível" },
    assuntos: [{ nome: "Contrato", principal: true }, { nome: "Indenização" }],
    nomeForum: "Fórum Cível de Poá",
  }, "2ª Vara Cível da Comarca de Poá");
  assert.deepEqual(value, { distributionDate: "2025-06-01", processClass: "Procedimento Comum Cível", subject: "Contrato", district: "Poá", forum: "Fórum Cível de Poá" });
});
test("não escolhe arbitrariamente assunto de lista com vários assuntos", () => {
  const value = extractDjenProcessMetadata({ assuntos: [{ nome: "A" }, { nome: "B" }] }, null);
  assert.equal(value.subject, null);
});

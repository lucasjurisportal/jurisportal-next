import assert from "node:assert/strict";
import test from "node:test";
import { parseImportedSubjects, suggestMapping } from "./import-definition";

test("reconhece colunas usuais de clientes", () => {
  const mapping = suggestMapping("clients", ["Nome", "CPF/CNPJ", "E-mail", "WhatsApp", "CEP", "Rua", "Número", "Bairro", "Cidade", "UF"]);
  assert.equal(mapping.name, "Nome");
  assert.equal(mapping.taxId, "CPF/CNPJ");
  assert.equal(mapping.postalCode, "CEP");
  assert.equal(mapping.street, "Rua");
});

test("área, procedimento e assuntos são colunas diferentes", () => {
  const mapping = suggestMapping("processes", ["Área do Direito", "Classe processual", "Assunto principal", "Outros assuntos", "Fórum"]);
  assert.equal(mapping.caseType, "Área do Direito");
  assert.equal(mapping.processClass, "Classe processual");
  assert.equal(mapping.subject, "Assunto principal");
  assert.equal(mapping.otherSubjects, "Outros assuntos");
  assert.equal(mapping.forum, "Fórum");
});

test("reconhece colunas usuais de processos", () => {
  const mapping = suggestMapping("processes", ["Número CNJ", "CPF Cliente", "Tribunal", "Valor da causa", "E-mail do responsável"]);
  assert.equal(mapping.cnj, "Número CNJ");
  assert.equal(mapping.primaryClientTaxId, "CPF Cliente");
  assert.equal(mapping.caseValue, "Valor da causa");
});

test("importação preserva assuntos com vírgula e elimina repetição exata", () => {
  assert.deepEqual(parseImportedSubjects("Contratos, Bancários; Juros; Contratos, Bancários\n"), ["Contratos, Bancários", "Juros"]);
  assert.deepEqual(parseImportedSubjects(""), []);
});

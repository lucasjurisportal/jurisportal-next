import assert from "node:assert/strict";
import test from "node:test";
import { suggestMapping } from "./import-definition";

test("reconhece colunas usuais de clientes", () => {
  const mapping = suggestMapping("clients", ["Nome", "CPF/CNPJ", "E-mail", "WhatsApp", "CEP", "Rua", "Número", "Bairro", "Cidade", "UF"]);
  assert.equal(mapping.name, "Nome");
  assert.equal(mapping.taxId, "CPF/CNPJ");
  assert.equal(mapping.postalCode, "CEP");
  assert.equal(mapping.street, "Rua");
});

test("reconhece colunas usuais de processos", () => {
  const mapping = suggestMapping("processes", ["Número CNJ", "CPF Cliente", "Tribunal", "Valor da causa", "E-mail do responsável"]);
  assert.equal(mapping.cnj, "Número CNJ");
  assert.equal(mapping.primaryClientTaxId, "CPF Cliente");
  assert.equal(mapping.caseValue, "Valor da causa");
});

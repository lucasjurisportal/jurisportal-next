import test from "node:test";
import assert from "node:assert/strict";
import { replacePetitionVariables } from "./template-variables";

test("substitui somente variáveis conhecidas e preserva as pendentes", () => {
  const result = replacePetitionVariables(
    "Cliente {{CLIENTE_NOME}} no processo {{PROCESSO_NUMERO}} por {{ADVOGADO_NOME}}.",
    { "{{CLIENTE_NOME}}": "Maria", "{{ADVOGADO_NOME}}": "Lucas" },
  );
  assert.equal(result, "Cliente Maria no processo {{PROCESSO_NUMERO}} por Lucas.");
});

test("substitui ocorrências repetidas da mesma variável", () => {
  const result = replacePetitionVariables("{{CLIENTE_NOME}} / {{CLIENTE_NOME}}", { "{{CLIENTE_NOME}}": "João" });
  assert.equal(result, "João / João");
});

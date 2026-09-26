import assert from "node:assert/strict";
import test from "node:test";
import { opposingPartyMatchesRepresentedClient, withManualOpposingParty } from "./process-opposing-party";

test("insere parte manual sem excluir as importadas do DJeN", () => {
  const original = [{ name: "Banco antigo", role: "Réu", document: "" }];
  const changed = withManualOpposingParty(original, "  Novo Banco  ");
  assert.deepEqual(changed, [...original, { name: "Novo Banco", role: "Parte contrária", document: "" }]);
  assert.deepEqual(original, [{ name: "Banco antigo", role: "Réu", document: "" }]);
});
test("atualização substitui somente contraparte manual e mantém as demais", () => {
  const old = [{ name: "A", role: "Autor", document: "" }, { name: "Banco anterior", role: "Parte contrária", document: "" }];
  assert.deepEqual(withManualOpposingParty(old, "Banco certo"), [old[0], { name: "Banco certo", role: "Parte contrária", document: "" }]);
  assert.deepEqual(withManualOpposingParty(old, ""), [old[0]]);
});
test("não permite que o próprio cliente apareça como adversário", () => {
  assert.equal(opposingPartyMatchesRepresentedClient("Lucineia Rosa", ["Lucinéia  Rosa"]), true);
  assert.equal(opposingPartyMatchesRepresentedClient("Banco C", ["Lucineia Rosa"]), false);
});

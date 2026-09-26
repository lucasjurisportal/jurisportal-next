import assert from "node:assert/strict";
import test from "node:test";
import { buildProcessDisplayReference, formatInternalProcessCode, selectOpposingPartyName } from "./process-reference";

test("mantém número sequencial por organização e ano", () => {
  assert.equal(formatInternalProcessCode(2026, 1), "20260001");
  assert.equal(formatInternalProcessCode(2026, 42), "20260042");
  assert.equal(formatInternalProcessCode(2026, 10000), "202610000");
});

test("representado vem primeiro, adversário vem depois e ausência é explícita", () => {
  assert.equal(buildProcessDisplayReference({ internalCode: "20260001", primaryClientName: "Lucineia Rosa", opposingPartyName: "Banco Exemplo" }), "20260001 - Lucineia Rosa X Banco Exemplo");
  assert.equal(buildProcessDisplayReference({ internalCode: "20260001", primaryClientName: "Lucineia Rosa" }), "20260001 - Lucineia Rosa X Parte contrária não cadastrada");
  assert.equal(buildProcessDisplayReference({ internalCode: "20260001" }), "20260001 - Cliente não informado X Parte contrária não cadastrada");
});

test("não confunde o cliente representado com outra parte, ainda que venha primeiro no banco", () => {
  assert.equal(selectOpposingPartyName({ representedClients: [{ name: "Lucineia Rosa", partyRole: "Ré" }], otherParties: [
    { name: "Lucinéia Rosa", role: "Ré" }, { name: "Banco Exemplo", role: "Autor" },
  ] }), "Banco Exemplo");
});

test("identifica polo oposto quando cliente está como autor ou réu", () => {
  assert.equal(selectOpposingPartyName({ representedClients: [{ name: "Maria", partyRole: "Autora" }], otherParties: [
    { name: "Terceiro", role: "Autor" }, { name: "João", role: "Réu" },
  ] }), "João");
  assert.equal(selectOpposingPartyName({ representedClients: [{ name: "João", partyRole: "Réu" }], otherParties: [
    { name: "Maria", role: "Autora" }, { name: "Terceiro", role: "Réu" },
  ] }), "Maria");
});

test("não inventa o polo adversário com múltiplas partes sem papéis claros", () => {
  assert.equal(selectOpposingPartyName({ representedClients: [{ name: "Lucineia Rosa" }], otherParties: [
    { name: "Banco A", role: "" }, { name: "Banco B", role: "" },
  ] }), null);
  assert.equal(selectOpposingPartyName({ representedClients: [{ name: "João", partyRole: "Réu" }], otherParties: [
    { name: "Carlos", role: "Réu" },
  ] }), null);
});

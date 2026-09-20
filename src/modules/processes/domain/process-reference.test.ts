import assert from "node:assert/strict";
import test from "node:test";
import { buildProcessDisplayReference, formatInternalProcessCode } from "./process-reference";

test("formata referência anual com quatro posições iniciais", () => {
  assert.equal(formatInternalProcessCode(2026, 1), "20260001");
  assert.equal(formatInternalProcessCode(2026, 42), "20260042");
});

test("mantém sequência acima de 9999 sem colisão silenciosa", () => {
  assert.equal(formatInternalProcessCode(2026, 10000), "202610000");
});

test("monta rótulo amigável sem transformar nomes em identidade persistida", () => {
  assert.equal(buildProcessDisplayReference({ internalCode: "20260001", primaryClientName: "Cliente", opposingPartyName: "Oposto" }), "20260001 - Cliente x Oposto");
  assert.equal(buildProcessDisplayReference({ internalCode: "20260001", primaryClientName: "Cliente" }), "20260001 - Cliente");
});

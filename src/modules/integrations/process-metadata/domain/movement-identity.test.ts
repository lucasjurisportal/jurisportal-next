import test from "node:test";
import assert from "node:assert/strict";
import { identifyMovements } from "./movement-identity";
import type { ExternalProcessMovement } from "./process-metadata";
const movement: ExternalProcessMovement = { source: "DATAJUD_PUBLIC", code: 26,
  name: "Juntada de petição", occurredAt: "2026-09-23T09:00:00Z", judicialBody: "2ª Vara" };
test("repetir busca não altera identidade; movimento de outra data não colapsa", () => {
  const first = identifyMovements([movement, { ...movement, occurredAt: "2026-09-24T09:00:00Z" }]);
  const second = identifyMovements([movement, { ...movement, occurredAt: "2026-09-24T09:00:00Z" }]);
  assert.deepEqual(first.map(i => i.externalKey), second.map(i => i.externalKey));
  assert.notEqual(first[0].externalKey, first[1].externalKey);
});
test("dois movimentos iguais dentro do mesmo retorno preservam ocorrências", () => {
  const [a, b] = identifyMovements([movement, movement]);
  assert.notEqual(a.externalKey, b.externalKey);
});

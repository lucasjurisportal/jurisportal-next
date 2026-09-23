import assert from "node:assert/strict";
import test from "node:test";
import { recentDjenDays } from "./djen-update-days";

test("terça mostra a segunda e terça", () => {
  assert.deepEqual(recentDjenDays("2026-09-22"), ["2026-09-21", "2026-09-22"]);
});
test("sábado e domingo preservam sexta; segunda mantém período completo", () => {
  assert.deepEqual(recentDjenDays("2026-09-19"), ["2026-09-18", "2026-09-19"]);
  assert.deepEqual(recentDjenDays("2026-09-20"), ["2026-09-18", "2026-09-19", "2026-09-20"]);
  assert.deepEqual(recentDjenDays("2026-09-21"), ["2026-09-18", "2026-09-19", "2026-09-20", "2026-09-21"]);
});
test("não aceita data inválida", () => {
  assert.throws(() => recentDjenDays("2026-02-30"), /INVALID_DJEN_DAY/);
});

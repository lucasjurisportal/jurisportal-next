import test from "node:test";
import assert from "node:assert/strict";
import { saoPauloTodayString } from "./work-item-date";

test("data operacional respeita America/Sao_Paulo", () => {
  assert.equal(saoPauloTodayString(new Date("2026-09-15T02:00:00.000Z")), "2026-09-14");
  assert.equal(saoPauloTodayString(new Date("2026-09-15T12:00:00.000Z")), "2026-09-15");
});

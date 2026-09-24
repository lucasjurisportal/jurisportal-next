import assert from "node:assert/strict";
import test from "node:test";
import { planCatalog } from "./plan.catalog";
import { planChangePreview, PLANNED_AI_MONTHLY_CREDITS } from "./plan-change-preview";

test("upgrade mantém carteira; downgrade exige regularizar excesso sem exclusão", () => {
  assert.deepEqual(planChangePreview(planCatalog, "estrategico", "premium", 240), {
    direction: "upgrade", excessProcesses: 0, requiresReview: false,
  });
  assert.deepEqual(planChangePreview(planCatalog, "premium", "essencial", 240), {
    direction: "downgrade", excessProcesses: 140, requiresReview: true,
  });
  assert.equal(planChangePreview(planCatalog, "premium", "estrategico", 240).requiresReview, false);
});
test("cotas da interface são planejamento, sem fingir saldo operacional", () => {
  assert.deepEqual(Object.values(PLANNED_AI_MONTHLY_CREDITS), [0, 0, 100, 500, 2000, 5000]);
});

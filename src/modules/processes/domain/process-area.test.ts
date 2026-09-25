import assert from "node:assert/strict";
import test from "node:test";
import {
  CUSTOM_PROCESS_AREA, PROCESS_AREA_OPTIONS, UNCLASSIFIED_PROCESS_AREA,
  isSuggestedProcessArea, normalizedAreaFilter, processAreaFilterOptions,
} from "./process-area";

test("áreas são sugestões e valores próprios do escritório continuam válidos", () => {
  assert.equal(isSuggestedProcessArea("Cível"), true);
  assert.equal(isSuggestedProcessArea("Arbitragem"), false);
  assert.equal(PROCESS_AREA_OPTIONS.includes("Trabalhista"), true);
  assert.equal(normalizedAreaFilter(" Arbitragem "), "Arbitragem");
  assert.equal(normalizedAreaFilter(CUSTOM_PROCESS_AREA), undefined);
  assert.equal(normalizedAreaFilter("a".repeat(101)), undefined);
  assert.equal(normalizedAreaFilter("  "), undefined);
  assert.equal(normalizedAreaFilter(UNCLASSIFIED_PROCESS_AREA), UNCLASSIFIED_PROCESS_AREA);
});

test("filtro apresenta somente quantidades do escritório, inclui legados e não inventa área", () => {
  const groups = [
    { caseType: "Cível", _count: { id: 3 } },
    { caseType: "cível", _count: { id: 2 } },
    { caseType: "Arbitragem", _count: { id: 1 } },
    { caseType: "", _count: { id: 1 } },
    { caseType: null, _count: { id: 4 } },
  ];
  assert.deepEqual(processAreaFilterOptions(groups), {
    classified: [{ label: "Arbitragem", count: 1 }, { label: "Cível", count: 5 }],
    unclassified: 5,
  });
  assert.deepEqual(processAreaFilterOptions([]), { classified: [], unclassified: 0 });
});

import test from "node:test";
import assert from "node:assert/strict";
import { calculateContractedFee } from "./fee-calculation";

test("calcula honorário percentual sobre o valor da causa", () => {
  assert.equal(calculateContractedFee({ model: "PERCENTAGE", caseValue: 100000, fixedAmount: 0, percentage: 20, manualAmount: 0 }), 20000);
});

test("calcula fixo mais percentual", () => {
  assert.equal(calculateContractedFee({ model: "FIXED_PLUS_PERCENTAGE", caseValue: 50000, fixedAmount: 3000, percentage: 10, manualAmount: 0 }), 8000);
});

test("percentual exige valor da causa", () => {
  assert.throws(() => calculateContractedFee({ model: "PERCENTAGE", caseValue: 0, fixedAmount: 0, percentage: 20, manualAmount: 0 }), /CASE_VALUE_REQUIRED/);
});

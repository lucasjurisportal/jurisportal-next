export type FeeModel = "FIXED" | "PERCENTAGE" | "FIXED_PLUS_PERCENTAGE" | "MANUAL";

export function calculateContractedFee(input: {
  model: FeeModel;
  caseValue: number;
  fixedAmount: number;
  percentage: number;
  manualAmount: number;
}) {
  if (input.model === "FIXED") {
    if (input.fixedAmount <= 0) throw new Error("FEE_AMOUNT_REQUIRED");
    return input.fixedAmount;
  }
  if (input.model === "PERCENTAGE") {
    if (input.caseValue <= 0) throw new Error("CASE_VALUE_REQUIRED");
    if (input.percentage <= 0) throw new Error("FEE_AMOUNT_REQUIRED");
    return input.caseValue * (input.percentage / 100);
  }
  if (input.model === "FIXED_PLUS_PERCENTAGE") {
    if (input.caseValue <= 0) throw new Error("CASE_VALUE_REQUIRED");
    if (input.fixedAmount <= 0 || input.percentage <= 0) throw new Error("FEE_AMOUNT_REQUIRED");
    return input.fixedAmount + input.caseValue * (input.percentage / 100);
  }
  if (input.manualAmount <= 0) throw new Error("FEE_AMOUNT_REQUIRED");
  return input.manualAmount;
}

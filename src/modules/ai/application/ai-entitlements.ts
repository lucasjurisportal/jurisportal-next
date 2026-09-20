import { AI_ACTION_UNIT_COST, AI_MONTHLY_UNIT_LIMIT, type AiAction } from "../domain/ai-policy";
import type { PlanSlug } from "../../plans/domain/plan.types";

export type AiUsageDecision = {
  allowed: boolean;
  actionUnits: number;
  monthlyLimit: number;
  remainingBeforeAction: number;
  remainingAfterAction: number;
  reason?: "PLAN_WITHOUT_AI" | "MONTHLY_LIMIT_REACHED";
};

export function canConsumeAi(
  planSlug: PlanSlug,
  usedUnitsThisMonth: number,
  action: AiAction,
): AiUsageDecision {
  const monthlyLimit = AI_MONTHLY_UNIT_LIMIT[planSlug];
  const actionUnits = AI_ACTION_UNIT_COST[action];
  const remainingBeforeAction = Math.max(monthlyLimit - usedUnitsThisMonth, 0);

  if (monthlyLimit === 0) {
    return {
      allowed: false,
      actionUnits,
      monthlyLimit,
      remainingBeforeAction,
      remainingAfterAction: 0,
      reason: "PLAN_WITHOUT_AI",
    };
  }

  if (usedUnitsThisMonth + actionUnits > monthlyLimit) {
    return {
      allowed: false,
      actionUnits,
      monthlyLimit,
      remainingBeforeAction,
      remainingAfterAction: remainingBeforeAction,
      reason: "MONTHLY_LIMIT_REACHED",
    };
  }

  return {
    allowed: true,
    actionUnits,
    monthlyLimit,
    remainingBeforeAction,
    remainingAfterAction: monthlyLimit - usedUnitsThisMonth - actionUnits,
  };
}

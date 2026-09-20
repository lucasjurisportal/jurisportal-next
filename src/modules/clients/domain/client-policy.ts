import type { PlanLimit } from "@/modules/plans/domain/plan.types";

export function assertClientCapacity(currentCount: number, limit: PlanLimit): void {
  if (limit === "unlimited") return;
  if (currentCount >= limit) {
    throw new Error("CLIENT_LIMIT_REACHED");
  }
}

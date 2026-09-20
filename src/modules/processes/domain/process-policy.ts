import type { PlanLimit } from "@/modules/plans/domain/plan.types";

/**
 * O limite comercial de processos é consumido no momento da criação.
 * Encerrar ou arquivar NÃO libera capacidade automaticamente, evitando que o
 * limite seja contornado por arquivamentos artificiais.
 */
export function assertProcessCapacity(currentCount: number, limit: PlanLimit): void {
  if (limit === "unlimited") return;
  if (currentCount >= limit) throw new Error("PROCESS_LIMIT_REACHED");
}

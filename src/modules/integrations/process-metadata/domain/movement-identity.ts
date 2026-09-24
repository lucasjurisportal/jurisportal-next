import { createHash } from "node:crypto";
import type { ExternalProcessMovement } from "./process-metadata";

/** Mesmos metadados: a mesma movimentação. Ocorrências rigorosamente idênticas
 * recebem ordinal estável na ordem devolvida pela fonte (não colapsar entradas).
 * Sem ID público do evento, a deduplicação é de melhor esforço, não garantia de
 * identidade jurídica entre mudanças da origem.
 */
export function identifyMovements(items: ExternalProcessMovement[]) {
  const occurrences = new Map<string, number>();
  return items.map((item) => {
    const parts = [item.code, item.name.trim(), item.occurredAt, item.judicialBody?.trim() ?? null];
    const identity = JSON.stringify(parts);
    const count = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, count);
    return { ...item, externalKey: createHash("sha256").update(JSON.stringify([identity, count])).digest("hex") };
  });
}

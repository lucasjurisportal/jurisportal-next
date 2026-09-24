import { prisma } from "@/infrastructure/database/prisma";
import { identifyMovements } from "../domain/movement-identity";
import { lookupDatajudProcessDetail, ProcessLookupError } from "../infrastructure/datajud-client";

export async function listSavedProcessMovements(organizationId: string, processId: string) {
  return prisma.processExternalMovement.findMany({
    where: { organizationId, processId },
    // Importações recentes no topo para que o link Saiba mais leve a item visível.
    orderBy: [{ createdAt: "desc" }, { occurredAt: "desc" }],
    take: 200,
  });
}

/** Só recebe processo existente e pertencente ao escritório; NÃO cria processo nem prazo. */
export async function syncExistingProcessMovements(input: {
  organizationId: string; processId: string; actorUserId?: string | null;
}) {
  const process = await prisma.process.findFirst({ where: {
    id: input.processId, organizationId: input.organizationId,
  }, select: { id: true, cnjNormalized: true } });
  if (!process) throw new Error("PROCESS_NOT_FOUND");
  // Marca tentativa para priorizar outros processos na próxima rodada, mesmo se a fonte falhar.
  await prisma.process.updateMany({ where: { id: process.id, organizationId: input.organizationId },
    data: { lastMovementCheckAt: new Date() } });
  const response = await lookupDatajudProcessDetail(process.cnjNormalized);
  if (!response) return { processId: process.id, newMovements: 0, total: 0, truncated: false, firstNewId: null };
  // Limite de 100 já imposto pelo normalizador, não fingir que o restante foi importado.
  const identified = identifyMovements(response.movements);
  const existing = await prisma.processExternalMovement.findMany({
    where: { organizationId: input.organizationId, processId: process.id,
      source: "DATAJUD_PUBLIC", externalKey: { in: identified.map(x => x.externalKey) } },
    select: { externalKey: true },
  });
  const known = new Set(existing.map(x => x.externalKey));
  const fresh = identified.filter(x => !known.has(x.externalKey));
  const inserted = await prisma.processExternalMovement.createMany({
    data: identified.map(item => ({
      organizationId: input.organizationId, processId: process.id, source: item.source,
      externalKey: item.externalKey, code: item.code, name: item.name,
      occurredAt: item.occurredAt, judicialBody: item.judicialBody,
    })), skipDuplicates: true,
  });
  const firstNew = inserted.count && fresh.length ? await prisma.processExternalMovement.findFirst({
    where: { organizationId: input.organizationId, processId: process.id,
      source: "DATAJUD_PUBLIC", externalKey: { in: fresh.map(x => x.externalKey) } },
    orderBy: { createdAt: "desc" }, select: { id: true },
  }) : null;
  if (inserted.count) await prisma.auditEvent.create({
    data: { organizationId: input.organizationId, actorUserId: input.actorUserId ?? null,
      category: "processes", action: "process.external_movements_added",
      entityType: "process", entityId: process.id,
      metadata: { source: "DATAJUD_PUBLIC", count: inserted.count, truncated: response.movementsTruncated },
    },
  });
  return { processId: process.id, newMovements: inserted.count,
    total: response.movementsTotal, truncated: response.movementsTruncated,
    firstNewId: firstNew?.id ?? null };
}
export { ProcessLookupError };

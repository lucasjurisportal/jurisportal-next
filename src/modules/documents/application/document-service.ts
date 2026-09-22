import { randomUUID } from "node:crypto";
import { prisma } from "@/infrastructure/database/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { deleteR2Object, inspectR2Pdf, isR2BackupConfigured, presignR2 } from "../infrastructure/r2-storage";

const MB = 1024 * 1024;
export const MAX_PDF_BYTES = 50 * MB;
const GB = 1024 ** 3;

export class DocumentError extends Error {
  constructor(public readonly code: string, public readonly httpStatus = 422) { super(code); }
}

async function verifyProcess(organizationId: string, processId: string) {
  const found = await prisma.process.findFirst({ where: { organizationId, id: processId }, select: { id: true } });
  if (!found) throw new DocumentError("PROCESS_NOT_FOUND", 404);
}

/** Serializa todas as alterações de espaço para uma organização, inclusive entre múltiplas instâncias Vercel. */
async function lockOrganization(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
}

export function normalizePdfName(value: string) {
  const name = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180) || "";
  if (!name.toLowerCase().endsWith(".pdf") || name.length < 5) throw new DocumentError("PDF_NAME_INVALID");
  return name;
}

export async function startPdfUpload(input: {
  organizationId: string; processId: string; userId: string;
  planGb: number; name: string; sizeBytes: number; source?: "PETITION";
}) {
  await verifyProcess(input.organizationId, input.processId);
  const name = normalizePdfName(input.name);
  if (!Number.isSafeInteger(input.sizeBytes) || input.sizeBytes <= 0 || input.sizeBytes > MAX_PDF_BYTES) {
    throw new DocumentError("PDF_TOO_LARGE_OR_EMPTY");
  }
  const id = randomUUID();
  const storageKey = `organizations/${input.organizationId}/processes/${input.processId}/documents/${id}.pdf`;
  // Falha de configuração do R2 não cria reserva órfã.
  const uploadUrl = presignR2("PUT", storageKey, 600);
  const expiresAt = new Date(Date.now() + 15 * 60_000);
  const reserved = BigInt(input.sizeBytes);
  await prisma.$transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const usage = await tx.organizationStorageUsage.upsert({
      where: { organizationId: input.organizationId },
      create: { organizationId: input.organizationId },
      update: {},
    });
    const planBytes = BigInt(Math.floor(input.planGb * GB));
    if (usage.usedBytes + usage.reservedBytes + reserved > planBytes + usage.extraBytes) {
      throw new DocumentError("STORAGE_QUOTA_EXCEEDED", 409);
    }
    await tx.organizationStorageUsage.update({
      where: { organizationId: input.organizationId },
      data: { reservedBytes: { increment: reserved } },
    });
    await tx.processDocument.create({ data: {
      id, organizationId: input.organizationId, processId: input.processId,
      uploadedByUserId: input.userId, originalName: name, displayName: name,
      storageKey, sizeBytes: reserved, status: "PENDING", source: input.source ?? "UPLOAD", uploadExpiresAt: expiresAt,
    } });
  });
  return { id, uploadUrl, expiresAt: expiresAt.toISOString(), maxBytes: input.sizeBytes };
}

export async function finishPdfUpload(input: { organizationId: string; processId: string; documentId: string; userId: string }) {
  const document = await prisma.processDocument.findFirst({
    where: { id: input.documentId, organizationId: input.organizationId, processId: input.processId },
  });
  if (!document) throw new DocumentError("DOCUMENT_NOT_FOUND", 404);
  if (document.status === "ACTIVE") return { id: document.id, status: "ACTIVE" };
  if (document.status !== "PENDING") throw new DocumentError("DOCUMENT_NOT_PENDING", 409);
  if (document.uploadedByUserId !== input.userId) throw new DocumentError("DOCUMENT_UPLOAD_FORBIDDEN", 403);
  if (!document.uploadExpiresAt || document.uploadExpiresAt.getTime() < Date.now()) throw new DocumentError("UPLOAD_EXPIRED", 409);
  let verified;
  try {
    verified = await inspectR2Pdf(document.storageKey);
  } catch (error) {
    if (error instanceof Error && error.message === "R2_OBJECT_NOT_FOUND") throw new DocumentError("UPLOAD_NOT_FINISHED", 409);
    if (error instanceof Error && error.message === "PDF_INVALID") throw new DocumentError("PDF_INVALID", 422);
    throw error;
  }
  if (BigInt(verified.sizeBytes) > document.sizeBytes || verified.sizeBytes > MAX_PDF_BYTES) {
    throw new DocumentError("PDF_SIZE_EXCEEDS_RESERVATION", 422);
  }
  await prisma.$transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const current = await tx.processDocument.findFirst({ where: {
      id: input.documentId, processId: input.processId, organizationId: input.organizationId,
    } });
    if (!current || current.status !== "PENDING") return;
    if (!current.uploadExpiresAt || current.uploadExpiresAt.getTime() < Date.now()) throw new DocumentError("UPLOAD_EXPIRED", 409);
    await tx.processDocument.update({ where: { id: current.id }, data: {
      status: "ACTIVE", sizeBytes: BigInt(verified.sizeBytes), uploadExpiresAt: null,
    } });
    await tx.organizationStorageUsage.update({ where: { organizationId: input.organizationId }, data: {
      usedBytes: { increment: BigInt(verified.sizeBytes) },
      reservedBytes: { decrement: current.sizeBytes },
    } });
    await tx.auditEvent.create({ data: {
      organizationId: input.organizationId, actorUserId: input.userId,
      category: "documents", action: "document.uploaded", entityType: "process_document", entityId: current.id,
      metadata: { processId: input.processId, sizeBytes: verified.sizeBytes },
    } });
  });
  // Arquivos pequenos ganham tentativa imediata; os demais são copiados pelo worker.
  // A falha do backup não transforma um upload já confirmado em "upload falhou".
  if (isR2BackupConfigured() && verified.sizeBytes <= 8 * MB) {
    try {
      const { backupSingleDocument } = await import("./document-backup-service");
      await backupSingleDocument(document.id);
    } catch (error) {
      console.error("[documents.backup.after-upload]", document.id, error instanceof Error ? error.message : "FAILED");
    }
  }
  return { id: document.id, status: "ACTIVE" };
}

/** A eliminação definitiva só é habilitada após testar a restauração do backup. */
export function permanentDeletionEnabled() {
  return process.env.DOCUMENT_PERMANENT_DELETE_ENABLED === "true";
}

export async function listProcessDocuments(input: { organizationId: string; processId: string; planGb: number }) {
  await verifyProcess(input.organizationId, input.processId);
  const [items, usage] = await Promise.all([
    prisma.processDocument.findMany({ where: {
      organizationId: input.organizationId, processId: input.processId, status: { in: ["ACTIVE", "DELETED"] },
    }, orderBy: { createdAt: "desc" }, select: {
      id: true, displayName: true, sizeBytes: true, status: true,
      source: true, createdAt: true, deletedAt: true, backupStatus: true,
      uploadedBy: { select: { name: true } },
    } }),
    prisma.organizationStorageUsage.findUnique({ where: { organizationId: input.organizationId } }),
  ]);
  return {
    documents: items.map((doc) => ({ ...doc, sizeBytes: Number(doc.sizeBytes) })),
    permanentDeletionEnabled: permanentDeletionEnabled(),
    storage: {
      usedBytes: Number(usage?.usedBytes ?? 0),
      reservedBytes: Number(usage?.reservedBytes ?? 0),
      limitBytes: Math.floor(input.planGb * GB) + Number(usage?.extraBytes ?? 0),
    },
  };
}

export async function downloadPdf(input: { organizationId: string; processId: string; documentId: string; userId: string }) {
  const document = await prisma.processDocument.findFirst({ where: {
    id: input.documentId, organizationId: input.organizationId, processId: input.processId, status: "ACTIVE",
  } });
  if (!document) throw new DocumentError("DOCUMENT_NOT_FOUND", 404);
  const url = presignR2("GET", document.storageKey, 60);
  await prisma.auditEvent.create({ data: {
    organizationId: input.organizationId, actorUserId: input.userId,
    category: "documents", action: "document.download_link_issued",
    entityType: "process_document", entityId: document.id,
    metadata: { processId: input.processId },
  } });
  return { url, name: document.displayName };
}

export async function changeDocumentStatus(input: {
  organizationId: string; processId: string; documentId: string; userId: string;
  action: "delete" | "restore";
}) {
  const expected = input.action === "delete" ? "ACTIVE" : "DELETED";
  const newStatus = input.action === "delete" ? "DELETED" : "ACTIVE";
  const document = await prisma.$transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const found = await tx.processDocument.findFirst({ where: {
      id: input.documentId, organizationId: input.organizationId, processId: input.processId,
      status: expected,
    } });
    if (!found) throw new DocumentError("DOCUMENT_NOT_FOUND_OR_INVALID_STATUS", 404);
    if (input.action === "restore" && (!found.deletedAt || found.deletedAt.getTime() + 30 * 86_400_000 < Date.now())) {
      throw new DocumentError("DOCUMENT_RECOVERY_EXPIRED", 409);
    }
    const updated = await tx.processDocument.update({ where: { id: found.id }, data: {
      status: newStatus, deletedAt: newStatus === "DELETED" ? new Date() : null,
    } });
    await tx.auditEvent.create({ data: {
      organizationId: input.organizationId, actorUserId: input.userId,
      category: "documents", action: `document.${input.action}`, entityType: "process_document", entityId: found.id,
      metadata: { processId: input.processId },
    } });
    return updated;
  });
  return { id: document.id, status: document.status };
}

/** Solicitada apenas pelo proprietário; quota é liberada SOMENTE depois da confirmação do R2. */
export async function permanentlyDeleteDocument(input: {
  organizationId: string; processId: string; documentId: string; userId: string;
}) {
  if (!permanentDeletionEnabled()) throw new DocumentError("DOCUMENT_PURGE_DISABLED", 409);
  const document = await prisma.$transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const current = await tx.processDocument.findFirst({ where: {
      id: input.documentId, processId: input.processId, organizationId: input.organizationId, status: "DELETED",
    } });
    if (!current) throw new DocumentError("DOCUMENT_PURGE_REQUIRES_DELETED", 409);
    if (current.backupStatus !== "VERIFIED") throw new DocumentError("DOCUMENT_BACKUP_NOT_VERIFIED", 409);
    await tx.processDocument.update({ where: { id: current.id }, data: { status: "PURGING" } });
    await tx.auditEvent.create({ data: {
      organizationId: input.organizationId, actorUserId: input.userId,
      category: "documents", action: "document.permanent_deletion_requested",
      entityType: "process_document", entityId: current.id,
      metadata: { processId: input.processId },
    } });
    return current;
  });
  try {
    await deleteR2Object(document.storageKey);
  } catch (error) {
    console.error("[documents.purge.r2]", document.id, error);
    // O cron retentará documentos PURGING, sem liberar quota prematuramente.
    throw new DocumentError("DOCUMENT_PURGE_PENDING", 503);
  }
  await prisma.$transaction(async (tx) => {
    await lockOrganization(tx, input.organizationId);
    const current = await tx.processDocument.findUnique({ where: { id: document.id } });
    if (!current || current.status !== "PURGING") return;
    await tx.processDocument.delete({ where: { id: document.id } });
    await tx.organizationStorageUsage.update({ where: { organizationId: input.organizationId }, data: {
      usedBytes: { decrement: current.sizeBytes },
    } });
    await tx.auditEvent.create({ data: {
      organizationId: input.organizationId, actorUserId: input.userId,
      category: "documents", action: "document.permanently_deleted",
      entityType: "process_document", entityId: document.id,
      metadata: { processId: input.processId, sizeBytes: Number(document.sizeBytes) },
    } });
  });
  return { id: document.id, status: "PURGED" };
}

/** Deve ser executado por cron com CRON_SECRET; nunca a partir do navegador. */
export async function cleanupDocuments() {
  const now = new Date();
  const pending = await prisma.processDocument.findMany({
    where: { status: "PENDING", uploadExpiresAt: { lt: new Date(now.getTime() - 5 * 60_000) } },
    take: 30, orderBy: { createdAt: "asc" },
  });
  const expired = await prisma.processDocument.findMany({
    where: { OR: [
      { status: "DELETED", backupStatus: "VERIFIED", deletedAt: { lt: new Date(now.getTime() - 30 * 86_400_000) } },
      { status: "PURGING" },
    ] }, take: 30, orderBy: { deletedAt: "asc" },
  });
  let cleaned = 0;
  for (const candidate of [...pending, ...expired]) {
    // Primeiro marca PURGING em transação. Isso impede restaurar/finalizar enquanto o R2 é apagado.
    const marked = await prisma.$transaction(async (tx) => {
      await lockOrganization(tx, candidate.organizationId);
      const doc = await tx.processDocument.findUnique({ where: { id: candidate.id } });
      if (!doc || (doc.status !== candidate.status && doc.status !== "PURGING")) return null;
      if (doc.status !== "PURGING") {
        await tx.processDocument.update({ where: { id: doc.id }, data: { status: "PURGING" } });
      }
      return doc;
    });
    if (!marked) continue;
    try {
      await deleteR2Object(marked.storageKey);
    } catch (error) {
      console.error("[documents.cleanup.r2]", marked.id, error);
      continue; // permanece PURGING: próxima execução retenta, sem liberar quota prematuramente.
    }
    await prisma.$transaction(async (tx) => {
      await lockOrganization(tx, marked.organizationId);
      const current = await tx.processDocument.findUnique({ where: { id: marked.id } });
      if (!current || current.status !== "PURGING") return;
      await tx.processDocument.delete({ where: { id: marked.id } });
      await tx.organizationStorageUsage.update({ where: { organizationId: marked.organizationId }, data: {
        ...(current.deletedAt ? { usedBytes: { decrement: current.sizeBytes } } : { reservedBytes: { decrement: current.sizeBytes } }),
      } });
    });
    cleaned++;
  }
  return { cleaned, pending: pending.length, expired: expired.length };
}

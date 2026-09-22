import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { prisma } from "@/infrastructure/database/prisma";
import { getR2BackupKey, isR2BackupConfigured, presignR2 } from "../infrastructure/r2-storage";

const MB = 1024 * 1024;
const MAX_BACKUP_PDF = 50 * MB;
const LEASE_MS = 15 * 60_000;
const BACKOFF_MS = [5, 15, 60, 180, 720, 1440].map((minutes) => minutes * 60_000);
const ELIGIBLE = ["ACTIVE", "DELETED"];

type ObjectData = { data: Buffer; sha256: string; sizeBytes: number };
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const equalsHash = (left: string, right: string) => {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
};

async function readObject(key: string, target: "main" | "backup"): Promise<ObjectData | null> {
  const response = await fetch(presignR2("GET", key, 600, target), { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`R2_${target.toUpperCase()}_READ_${response.status}`);
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BACKUP_PDF) throw new Error("BACKUP_OBJECT_TOO_LARGE");
  const data = Buffer.from(await response.arrayBuffer());
  if (!data.length || data.length > MAX_BACKUP_PDF) throw new Error("BACKUP_OBJECT_SIZE_INVALID");
  if (!data.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("BACKUP_NOT_PDF");
  return { data, sha256: digest(data), sizeBytes: data.length };
}

async function putImmutable(key: string, data: Buffer, target: "main" | "backup") {
  const response = await fetch(presignR2("PUT", key, 600, target), {
    method: "PUT",
    headers: { "Content-Type": "application/pdf", "If-None-Match": "*" },
    body: new Uint8Array(data).buffer as ArrayBuffer,
    cache: "no-store",
  });
  // 412: uma tentativa anterior pode ter copiado o arquivo e falhado antes de confirmar no banco.
  // A verificação criptográfica após esta chamada decide se a cópia existente é válida.
  if (!response.ok && response.status !== 412) throw new Error(`R2_${target.toUpperCase()}_WRITE_${response.status}`);
}

async function verifyCopy(key: string, source: ObjectData, target: "main" | "backup") {
  const copy = await readObject(key, target);
  if (!copy || copy.sizeBytes !== source.sizeBytes || !equalsHash(copy.sha256, source.sha256)) {
    throw new Error("BACKUP_HASH_MISMATCH");
  }
}

/** Pode ser chamado repetidamente. Claim transacional previne dois workers copiando o mesmo PDF. */
export async function backupSingleDocument(documentId: string) {
  if (!isR2BackupConfigured()) throw new Error("R2_BACKUP_NOT_CONFIGURED");
  const now = new Date();
  const attemptId = randomUUID();
  const claimed = await prisma.processDocument.updateMany({
    where: {
      id: documentId, status: { in: ELIGIBLE },
      OR: [
        { backupStatus: { in: ["PENDING", "FAILED"] }, OR: [
          { backupNextAttemptAt: null }, { backupNextAttemptAt: { lte: now } },
        ] },
        { backupStatus: "COPYING", backupLeaseUntil: { lt: now } },
      ],
    },
    data: {
      backupStatus: "COPYING", backupLeaseUntil: new Date(now.getTime() + LEASE_MS),
      backupAttemptId: attemptId, backupAttempts: { increment: 1 }, backupLastError: null,
    },
  });
  if (claimed.count !== 1) return { copied: false, reason: "NOT_ELIGIBLE" };
  const document = await prisma.processDocument.findUniqueOrThrow({ where: { id: documentId } });
  try {
    const source = await readObject(document.storageKey, "main");
    if (!source) throw new Error("SOURCE_PDF_MISSING");
    if (BigInt(source.sizeBytes) !== document.sizeBytes) throw new Error("SOURCE_PDF_SIZE_MISMATCH");
    const backupKey = getR2BackupKey(document.storageKey);
    // Não sobrescrever backups existentes: nomes de objetos são únicos e a cópia é imutável.
    await putImmutable(backupKey, source.data, "backup");
    await verifyCopy(backupKey, source, "backup");
    const saved = await prisma.processDocument.updateMany({
      where: { id: documentId, backupStatus: "COPYING", backupAttemptId: attemptId },
      data: {
        backupStatus: "VERIFIED", backupObjectKey: backupKey,
        backupSha256: source.sha256, backupVerifiedAt: new Date(),
        backupLastError: null, backupNextAttemptAt: null,
        backupLeaseUntil: null, backupAttemptId: null,
      },
    });
    return { copied: saved.count === 1, reason: saved.count ? "VERIFIED" : "LEASE_LOST" };
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : "BACKUP_FAILED";
    const retryIndex = Math.min(document.backupAttempts - 1, BACKOFF_MS.length - 1);
    await prisma.processDocument.updateMany({
      where: { id: documentId, backupStatus: "COPYING", backupAttemptId: attemptId },
      data: {
        backupStatus: "FAILED", backupLastError: code,
        backupNextAttemptAt: new Date(Date.now() + BACKOFF_MS[Math.max(0, retryIndex)]),
        backupLeaseUntil: null, backupAttemptId: null,
      },
    });
    // Não incluir URL assinada, nomes de clientes, documentos ou dados confidenciais nos logs.
    console.error("[documents.backup]", { documentId, code });
    return { copied: false, reason: code };
  }
}

/** Worker incremental: roda localmente ou em cron autenticado; limite baixo evita esgotar Vercel. */
export async function backupPendingDocuments(limit = 2) {
  if (!isR2BackupConfigured()) throw new Error("R2_BACKUP_NOT_CONFIGURED");
  const bounded = Math.max(1, Math.min(10, Math.floor(limit)));
  const now = new Date();
  const candidates = await prisma.processDocument.findMany({
    where: {
      status: { in: ELIGIBLE },
      OR: [
        { backupStatus: { in: ["PENDING", "FAILED"] }, OR: [
          { backupNextAttemptAt: null }, { backupNextAttemptAt: { lte: now } },
        ] },
        { backupStatus: "COPYING", backupLeaseUntil: { lt: now } },
      ],
    },
    select: { id: true }, orderBy: { createdAt: "asc" }, take: bounded,
  });
  let verified = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const result = await backupSingleDocument(candidate.id);
    if (result.copied) verified++;
    else if (result.reason !== "NOT_ELIGIBLE") failed++;
  }
  const [pending, copying, failures] = await Promise.all([
    prisma.processDocument.count({ where: { status: { in: ELIGIBLE }, backupStatus: "PENDING" } }),
    prisma.processDocument.count({ where: { status: { in: ELIGIBLE }, backupStatus: "COPYING" } }),
    prisma.processDocument.count({ where: { status: { in: ELIGIBLE }, backupStatus: "FAILED" } }),
  ]);
  return { attempted: candidates.length, verified, failed, remaining: { pending, copying, failed: failures } };
}

/** Recuperação manual: somente para objetos faltantes na origem, sem sobrescrever PDFs existentes. */
export async function restoreDocumentFromBackup(documentId: string) {
  if (!isR2BackupConfigured()) throw new Error("R2_BACKUP_NOT_CONFIGURED");
  const document = await prisma.processDocument.findUnique({ where: { id: documentId } });
  if (!document || !ELIGIBLE.includes(document.status)) throw new Error("DOCUMENT_NOT_RESTORABLE");
  if (document.backupStatus !== "VERIFIED" || !document.backupObjectKey || !document.backupSha256) {
    throw new Error("DOCUMENT_BACKUP_NOT_VERIFIED");
  }
  const sourcePresent = await readObject(document.storageKey, "main");
  if (sourcePresent) throw new Error("SOURCE_EXISTS_RESTORE_ABORTED");
  const backup = await readObject(document.backupObjectKey, "backup");
  if (!backup || BigInt(backup.sizeBytes) !== document.sizeBytes || !equalsHash(backup.sha256, document.backupSha256)) {
    throw new Error("BACKUP_INTEGRITY_FAILED");
  }
  await putImmutable(document.storageKey, backup.data, "main");
  await verifyCopy(document.storageKey, backup, "main");
  return { restored: true, documentId };
}

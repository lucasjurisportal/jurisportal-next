import { createHash } from "node:crypto";
import { prisma } from "@/infrastructure/database/prisma";
import { renderPublicationDigest, safePublicAppUrl, type DigestCommunication } from "../domain/publication-digest";
import { planPublicationEmailBatches } from "../domain/publication-email-batches";

const MAX_ATTEMPTS = 4;
const BATCH_SIZE = 30;
const LEASE_MS = 15 * 60 * 1000;
const RESEND_KEY_MS = 24 * 60 * 60 * 1000;

const QUEUE_READ_LIMIT = 250;

async function loadPendingEmailQueue(organizationId: string, now = new Date()) {
  const rows = await prisma.publicationEmailDelivery.findMany({
    where: { organizationId, attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "PENDING" }, { status: "FAILED" },
        { status: "SENDING", leaseUntil: { lt: now } }] },
    take: QUEUE_READ_LIMIT,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      lawyerOab: { include: { user: { select: {
        id: true, name: true, email: true, emailVerified: true } } } },
      publication: { select: { id: true, organizationId: true, sourceStatus: true,
        kind: true, communicationType: true, processNumberFormatted: true, court: true,
        judicialBody: true, documentType: true, parties: true, summary: true, sourceUrl: true } },
    },
  });
  const members = await prisma.member.findMany({ where: { organizationId },
    select: { userId: true } });
  const planned = planPublicationEmailBatches({ rows, organizationId,
    activeMemberIds: new Set(members.map((member) => member.userId)),
    maxCommunications: BATCH_SIZE });
  return { planned, truncated: rows.length === QUEUE_READ_LIMIT };
}

/** Prévia de leitura: nunca altera a fila nem chama o Resend. Só expor ao proprietário autenticado. */
export async function previewPendingPublicationEmails(organizationId: string) {
  const { planned, truncated } = await loadPendingEmailQueue(organizationId);
  const reconciliationCount = await prisma.publicationEmailDelivery.count({
    where: { organizationId, status: "UNKNOWN" },
  });
  return {
    enabled: process.env.PUBLICATION_EMAIL_ENABLED === "true",
    configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM),
    pendingEmails: planned.batches.length,
    pendingCommunications: planned.readyCommunications,
    skipped: planned.skipped,
    needsReconciliation: reconciliationCount + planned.needsReconciliation.length,
    truncated,
  };
}

/** Envio desacoplado da captura: falha de Resend não desfaz publicação. Cron continua desligado. */
export async function dispatchPendingPublicationEmails(organizationId: string) {
  if (process.env.PUBLICATION_EMAIL_ENABLED !== "true") {
    return { disabled: true, sent: 0, emailBatches: 0, errors: 0 };
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    console.error("[publications.mail] REMETENTE_NAO_CONFIGURADO");
    return { disabled: false, sent: 0, emailBatches: 0, errors: 1 };
  }
  const now = new Date();
  const expired = new Date(now.getTime() - RESEND_KEY_MS);
  // Tentativa incerta além da janela de idempotência: conciliar no provedor.
  await prisma.publicationEmailDelivery.updateMany({
    where: { organizationId, status: { in: ["SENDING", "FAILED"] },
      firstAttemptAt: { lt: expired } },
    data: { status: "UNKNOWN", leaseUntil: null,
      lastError: "Conferir entrega no provedor antes de reenviar" },
  });
  const { planned } = await loadPendingEmailQueue(organizationId, now);
  if (planned.needsReconciliation.length) {
    await prisma.publicationEmailDelivery.updateMany({
      where: { id: { in: planned.needsReconciliation }, organizationId },
      data: { status: "UNKNOWN", leaseUntil: null,
        lastError: "Destinatário alterado: conferir envio anterior" },
    });
  }
  if (!planned.batches.length) return { disabled: false, sent: 0, emailBatches: 0, errors: 0 };
  let sent = 0;
  let emailBatches = 0;
  let errors = 0;
  for (const batch of planned.batches) {
    const ids = batch.rows.map((row) => row.id).sort();
    // Reutiliza exatamente a mesma chave e o mesmo conjunto de registros no retry.
    const batchKey = batch.priorBatchKey ?? `jurisportal-djen-${createHash("sha256")
      .update(organizationId + "|" + batch.userId + "|" + ids.join("|"))
      .digest("hex")}`;
    const leaseUntil = new Date(Date.now() + LEASE_MS);
    try {
      // Tudo ou nada: uma disputa entre dois workers não pode deixar metade do
      // lote em SENDING e enviar e-mail incompleto.
      await prisma.$transaction(async (tx) => {
        await tx.publicationEmailDelivery.updateMany({
          where: { id: { in: ids }, organizationId, firstAttemptAt: null },
          data: { firstAttemptAt: now },
        });
        const locked = await tx.publicationEmailDelivery.updateMany({
          where: { id: { in: ids }, organizationId, attempts: { lt: MAX_ATTEMPTS },
            OR: [{ status: "PENDING" }, { status: "FAILED" },
              { status: "SENDING", leaseUntil: { lt: now } }] },
          data: { status: "SENDING", batchKey, recipientEmail: batch.email,
            attempts: { increment: 1 }, leaseUntil, lastError: null },
        });
        if (locked.count !== ids.length) throw new Error("EMAIL_BATCH_ALREADY_CLAIMED");
      });
    } catch (cause) {
      if (cause instanceof Error && cause.message === "EMAIL_BATCH_ALREADY_CLAIMED") continue;
      errors++;
      console.error("[publications.mail] EMAIL_BATCH_CLAIM_FAILED");
      continue;
    }
    const user = batch.rows[0].lawyerOab.user;
    const items: DigestCommunication[] = batch.rows.map((row) => ({
      publicationId: row.publication.id,
      kind: row.publication.kind, communicationType: row.publication.communicationType,
      cnj: row.publication.processNumberFormatted, court: row.publication.court,
      judicialBody: row.publication.judicialBody, documentType: row.publication.documentType,
      parties: Array.isArray(row.publication.parties)
        ? row.publication.parties.flatMap((value): Array<{ name: string; role: string }> => {
          if (!value || typeof value !== "object" || Array.isArray(value)) return [];
          const party = value as Record<string, unknown>;
          return typeof party.name === "string" ? [{ name: party.name,
            role: typeof party.role === "string" ? party.role : "" }] : [];
        }) : [],
      summary: row.publication.summary, sourceUrl: row.publication.sourceUrl,
    }));
    const digest = renderPublicationDigest({ name: user.name, items,
      baseUrl: safePublicAppUrl(process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL) });
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json", "Idempotency-Key": batchKey },
        body: JSON.stringify({ from: process.env.RESEND_FROM, to: [batch.email],
          subject: digest.subject, text: digest.text, html: digest.html }),
        signal: AbortSignal.timeout(12_000),
      });
      const body = await response.json().catch(() => null) as { id?: string } | null;
      if (!response.ok || !body?.id) throw new Error(`RESEND_HTTP_${response.status}`);
      await prisma.publicationEmailDelivery.updateMany({
        where: { id: { in: ids }, organizationId, batchKey, status: "SENDING" },
        data: { status: "SENT", providerEmailId: body.id,
          sentAt: new Date(), leaseUntil: null },
      });
      sent += digest.communicationCount;
      emailBatches++;
    } catch (cause) {
      errors++;
      const message = cause instanceof Error && /^RESEND_HTTP_\d+$/.test(cause.message)
        ? cause.message : "EMAIL_PROVIDER_UNAVAILABLE";
      await prisma.publicationEmailDelivery.updateMany({
        where: { id: { in: ids }, organizationId, batchKey, status: "SENDING" },
        data: { status: "FAILED", leaseUntil: null, lastError: message },
      });
      console.error("[publications.mail] falha no lote", {
        code: message, count: batch.rows.length });
    }
  }
  return { disabled: false, sent, emailBatches, errors };
}

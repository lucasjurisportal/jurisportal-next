import { createHash } from "node:crypto";
import { prisma } from "@/infrastructure/database/prisma";
import { renderPublicationDigest, safePublicAppUrl, type DigestCommunication } from "../domain/publication-digest";

const MAX_ATTEMPTS = 4;
const BATCH_SIZE = 30;
const LEASE_MS = 15 * 60 * 1000;
const RESEND_KEY_MS = 24 * 60 * 60 * 1000;

/** A função nunca ativa o agendador. Chamá-la depois da captura manual e da revisão aprovada. */
export async function dispatchPendingPublicationEmails(organizationId: string) {
  if (process.env.PUBLICATION_EMAIL_ENABLED !== "true") return { disabled: true, sent: 0, errors: 0 };
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM) {
    console.error("[publications.mail] Resend não configurado");
    return { disabled: false, sent: 0, errors: 1 };
  }
  const now = new Date();
  const expired = new Date(now.getTime() - RESEND_KEY_MS);
  // Uma entrega com estado incerto há >24h NÃO é enviada outra vez sem conciliação
  // com o provedor: a proteção de idempotência do Resend expira nesse prazo.
  await prisma.publicationEmailDelivery.updateMany({
    where: { organizationId, status: { in: ["SENDING", "FAILED"] }, firstAttemptAt: { lt: expired } },
    data: { status: "UNKNOWN", leaseUntil: null, lastError: "Conferir entrega no provedor antes de reenviar" },
  });
  const rows = await prisma.publicationEmailDelivery.findMany({
    where: { organizationId, attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "PENDING" }, { status: "FAILED" }, { status: "SENDING", leaseUntil: { lt: now } }] },
    take: 250,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    include: {
      lawyerOab: { include: { user: { select: { id: true, name: true, email: true, emailVerified: true } } } },
      publication: { select: { id: true, sourceStatus: true, kind: true, communicationType: true,
        processNumberFormatted: true, court: true, judicialBody: true, documentType: true,
        parties: true, summary: true, sourceUrl: true } },
    },
  });
  const eligible = rows.filter((row) => row.lawyerOab.user.emailVerified
    && row.lawyerOab.isActive && row.publication.sourceStatus === "ACTIVE");
  if (!eligible.length) return { disabled: false, sent: 0, errors: 0 };
  const groups = new Map<string, typeof eligible>();
  for (const row of eligible) {
    const key = row.batchKey ? `batch:${row.batchKey}` : `user:${row.lawyerOab.user.id}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  let sent = 0;
  let errors = 0;
  const memberIds = new Set((await prisma.member.findMany({ where: { organizationId }, select: { userId: true } })).map((member) => member.userId));
  for (const entries of groups.values()) {
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const batch = entries.slice(i, i + BATCH_SIZE);
      const user = batch[0].lawyerOab.user;
      if (!memberIds.has(user.id)) continue;
      const ids = batch.map((row) => row.id).sort();
      if (batch.some((row) => row.batchKey && row.recipientEmail !== user.email)) {
        await prisma.publicationEmailDelivery.updateMany({
          where: { id: { in: ids }, organizationId },
          data: { status: "UNKNOWN", lastError: "Destinatário alterado: conferir envio anterior" },
        });
        continue;
      }
      await prisma.publicationEmailDelivery.updateMany({
        where: { id: { in: ids }, organizationId, firstAttemptAt: null },
        data: { firstAttemptAt: now },
      });
      const batchKey = batch[0].batchKey ?? `jurisportal-djen-${createHash("sha256")
        .update(organizationId + "|" + user.id + "|" + ids.join("|"))
        .digest("hex")}`;
      const locked = await prisma.publicationEmailDelivery.updateMany({
        where: { id: { in: ids }, organizationId,
          OR: [{ status: "PENDING" }, { status: "FAILED" }, { status: "SENDING", leaseUntil: { lt: now } }] },
        data: { status: "SENDING", batchKey, recipientEmail: user.email,
          attempts: { increment: 1 }, leaseUntil: new Date(Date.now() + LEASE_MS), lastError: null },
      });
      // Se houve disputa, NÃO enviar um lote parcialmente reivindicado.
      if (locked.count !== ids.length) continue;
      const items: DigestCommunication[] = batch.map((row) => ({
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
          body: JSON.stringify({ from: process.env.RESEND_FROM, to: [user.email],
            subject: digest.subject, text: digest.text, html: digest.html }),
          signal: AbortSignal.timeout(12_000),
        });
        const body = await response.json().catch(() => null) as { id?: string } | null;
        if (!response.ok || !body?.id) throw new Error(`RESEND_HTTP_${response.status}`);
        await prisma.publicationEmailDelivery.updateMany({
          where: { id: { in: ids }, organizationId, batchKey, status: "SENDING" },
          data: { status: "SENT", providerEmailId: body.id, sentAt: new Date(), leaseUntil: null },
        });
        sent += digest.communicationCount;
      } catch (cause) {
        errors++;
        const message = cause instanceof Error && /^RESEND_HTTP_\d+$/.test(cause.message)
          ? cause.message : "EMAIL_PROVIDER_UNAVAILABLE";
        await prisma.publicationEmailDelivery.updateMany({
          where: { id: { in: ids }, organizationId, batchKey, status: "SENDING" },
          data: { status: "FAILED", leaseUntil: null, lastError: message },
        });
        console.error("[publications.mail] falha no lote", { code: message, count: batch.length });
      }
    }
  }
  return { disabled: false, sent, errors };
}

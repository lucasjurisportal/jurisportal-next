/** Planejamento puro: não consulta banco nem envia mensagens. */
export type EmailQueueRow = {
  id: string;
  organizationId: string;
  publicationId: string;
  batchKey: string | null;
  recipientEmail: string | null;
  lawyerOab: {
    organizationId: string;
    isActive: boolean;
    user: { id: string; email: string; emailVerified: boolean };
  };
  publication: { organizationId: string; sourceStatus: string };
};

export type PlannedEmailBatch<T extends EmailQueueRow> = {
  userId: string;
  email: string;
  priorBatchKey: string | null;
  rows: T[];
  uniquePublications: number;
};

export function planPublicationEmailBatches<T extends EmailQueueRow>(input: {
  rows: readonly T[];
  organizationId: string;
  activeMemberIds: ReadonlySet<string>;
  maxCommunications?: number;
}) {
  const max = input.maxCommunications ?? 30;
  if (!Number.isSafeInteger(max) || max < 1) throw new Error("EMAIL_BATCH_LIMIT_INVALID");
  const byUserAndAttempt = new Map<string, T[]>();
  const needsReconciliation: string[] = [];
  let skipped = 0;
  for (const row of input.rows) {
    const user = row.lawyerOab.user;
    if (row.organizationId !== input.organizationId ||
      row.lawyerOab.organizationId !== input.organizationId ||
      row.publication.organizationId !== input.organizationId ||
      !input.activeMemberIds.has(user.id) || !row.lawyerOab.isActive ||
      !user.emailVerified || !user.email.trim() || row.publication.sourceStatus !== "ACTIVE") {
      skipped++;
      continue;
    }
    // Uma tentativa já iniciada não pode mudar de endereço no retry.
    if (row.batchKey && row.recipientEmail !== user.email) {
      needsReconciliation.push(row.id);
      continue;
    }
    // Separar tentativas preexistentes de novos itens impede alterar a carga de
    // uma Idempotency-Key já enviada ao provedor.
    const key = `${user.id}|${row.batchKey ? `retry:${row.batchKey}` : "new"}`;
    const existing = byUserAndAttempt.get(key) ?? [];
    existing.push(row);
    byUserAndAttempt.set(key, existing);
  }
  const batches: Array<PlannedEmailBatch<T>> = [];
  for (const rows of byUserAndAttempt.values()) {
    const publicationGroups = new Map<string, T[]>();
    for (const row of rows) {
      const same = publicationGroups.get(row.publicationId) ?? [];
      same.push(row);
      publicationGroups.set(row.publicationId, same);
    }
    let chunk: T[] = [];
    let unique = 0;
    for (const records of publicationGroups.values()) {
      if (unique >= max) {
        batches.push({ userId: chunk[0].lawyerOab.user.id, email: chunk[0].lawyerOab.user.email,
          priorBatchKey: chunk[0].batchKey, rows: chunk, uniquePublications: unique });
        chunk = [];
        unique = 0;
      }
      chunk.push(...records);
      unique++;
    }
    if (chunk.length) batches.push({ userId: chunk[0].lawyerOab.user.id,
      email: chunk[0].lawyerOab.user.email, priorBatchKey: chunk[0].batchKey,
      rows: chunk, uniquePublications: unique });
  }
  return { batches, skipped, needsReconciliation,
    readyCommunications: batches.reduce((sum, batch) => sum + batch.uniquePublications, 0) };
}

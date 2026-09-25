import test from "node:test";
import assert from "node:assert/strict";
import { planPublicationEmailBatches, type EmailQueueRow } from "./publication-email-batches";

const ORG = "office-a";
function row(id: string, publicationId: string, userId = "adv-1", patch: Partial<EmailQueueRow> = {}): EmailQueueRow {
  return {
    id, publicationId, organizationId: ORG, batchKey: null, recipientEmail: null,
    lawyerOab: { organizationId: ORG, isActive: true,
      user: { id: userId, email: `${userId}@example.org`, emailVerified: true } },
    publication: { organizationId: ORG, sourceStatus: "ACTIVE" },
    ...patch,
  };
}
function plan(rows: EmailQueueRow[], maxCommunications?: number) {
  return planPublicationEmailBatches({ rows, organizationId: ORG,
    activeMemberIds: new Set(["adv-1", "adv-2"]), maxCommunications });
}
test("duas OABs de um advogado e a mesma comunicação geram um e-mail e uma comunicação", () => {
  const result = plan([row("one", "publication-1"), row("two", "publication-1"), row("three", "publication-2")]);
  assert.equal(result.batches.length, 1);
  assert.equal(result.batches[0].rows.length, 3);
  assert.equal(result.batches[0].uniquePublications, 2);
});
test("dois advogados destinatários recebem grupos independentes", () => {
  const result = plan([row("one", "publication-1"), row("two", "publication-1", "adv-2")]);
  assert.equal(result.batches.length, 2);
});
test("uma tentativa anterior nunca mistura itens novos na mesma idempotency key", () => {
  const retry = row("retry", "publication-1", "adv-1", {
    batchKey: "batch-original", recipientEmail: "adv-1@example.org" });
  const result = plan([retry, row("new", "publication-2")]);
  assert.equal(result.batches.length, 2);
  assert.ok(result.batches.some((batch) => batch.priorBatchKey === "batch-original"));
});
test("troca de e-mail em tentativa existente exige conciliação, não reenvio automático", () => {
  const result = plan([row("one", "publication-1", "adv-1", {
    batchKey: "sent-maybe", recipientEmail: "old@example.org" })]);
  assert.deepEqual(result.needsReconciliation, ["one"]);
  assert.equal(result.batches.length, 0);
});
test("não mistura outro escritório, inscrição inativa ou identidade não verificada", () => {
  const result = plan([
    row("foreign", "publication-1", "adv-1", { organizationId: "office-b" }),
    row("inactive", "publication-2", "adv-1", { lawyerOab: { organizationId: ORG, isActive: false,
      user: { id: "adv-1", email: "adv-1@example.org", emailVerified: true } } }),
    row("not-verified", "publication-3", "adv-1", { lawyerOab: { organizationId: ORG, isActive: true,
      user: { id: "adv-1", email: "adv-1@example.org", emailVerified: false } } }),
    row("cancelled", "publication-4", "adv-1", { publication: { organizationId: ORG, sourceStatus: "CANCELLED" } }),
  ]);
  assert.equal(result.skipped, 4);
  assert.equal(result.batches.length, 0);
});
test("divide somente após 30 comunicações distintas, não após 30 linhas de OAB", () => {
  const rows = Array.from({ length: 31 }, (_, index) => row(`item-${index}`, `publication-${index}`));
  rows.unshift(row("same-publication-second-oab", "publication-0"));
  const result = plan(rows);
  assert.deepEqual(result.batches.map((batch) => batch.uniquePublications), [30, 1]);
  assert.equal(result.batches[0].rows.length, 31);
});

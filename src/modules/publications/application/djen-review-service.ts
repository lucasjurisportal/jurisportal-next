import { prisma } from "@/infrastructure/database/prisma";
import { normalizeDjenItem } from "@/modules/integrations/djen/domain/djen-publication";
import { persistPublication, nextIsoDate, saoPauloDateString, resolvePlan } from "./djen-capture-service";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { recentDjenDays } from "../domain/djen-update-days";

export async function getDjenCaptureStatus(organizationId: string) {
  return prisma.djenCaptureCursor.findMany({
    where: { organizationId },
    orderBy: { lastAttemptAt: "desc" },
    select: {
      status: true, lastError: true, completedThrough: true, lastSuccessAt: true,
      lawyerOab: { select: { rawNumber: true, state: true } },
    },
  });
}

export async function getDjenReviewCount(organizationId: string) {
  return prisma.djenReviewCandidate.count({ where: { organizationId, status: "PENDING" } });
}

export async function listDjenReviewCandidates(organizationId: string) {
  return prisma.djenReviewCandidate.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { lastSeenAt: "desc" }, take: 100,
    include: { lawyerOab: { include: { user: { select: { id: true, name: true } } } } },
  });
}

/** Prévia da fila na própria página de Publicações, isolada por escritório. */
export async function getDjenReviewPreview(organizationId: string) {
  return prisma.djenReviewCandidate.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { lastSeenAt: "desc" },
    take: 20,
    include: { lawyerOab: { include: { user: { select: { id: true, name: true } } } } },
  });
}

/** Resumo visual, NÃO apaga publicações antigas do banco. Sexta permanece visível no fim de semana e na segunda. */
export async function getDjenRecentUpdates(organizationId: string, today = saoPauloDateString()) {
  const dates = recentDjenDays(today);
  const results = await Promise.all(dates.map(async (day) => {
    const since = new Date(`${day}T03:00:00.000Z`);
    const before = new Date(`${nextIsoDate(day)}T03:00:00.000Z`);
    const [confirmed, pending] = await Promise.all([
      prisma.publication.count({ where: { organizationId, source: "DJEN", capturedAt: { gte: since, lt: before } } }),
      prisma.djenReviewCandidate.count({ where: { organizationId, status: "PENDING", firstSeenAt: { gte: since, lt: before } } }),
    ]);
    return { day, confirmed, pending };
  }));
  return results.filter((item) => item.confirmed > 0 || item.pending > 0).reverse();
}

/** Aprovação não confirma PRAZO: apenas identifica a comunicação e gera revisão jurídica. */
export async function decideDjenReview(input: {
  organizationId: string; candidateId: string; actorUserId: string;
  decision: "APPROVE" | "DISMISS";
}) {
  const candidate = await prisma.djenReviewCandidate.findFirst({
    where: { id: input.candidateId, organizationId: input.organizationId },
    include: { lawyerOab: { select: { isActive: true, organizationId: true } } },
  });
  if (!candidate) throw new Error("DJEN_CANDIDATE_NOT_FOUND");
  if (candidate.status !== "PENDING") throw new Error("DJEN_CANDIDATE_ALREADY_DECIDED");
  if (!candidate.lawyerOab.isActive || candidate.lawyerOab.organizationId !== input.organizationId) {
    throw new Error("DJEN_OAB_INACTIVE");
  }
  const publication = normalizeDjenItem(candidate.payload);
  if (publication.externalKey !== candidate.externalKey) throw new Error("DJEN_CANDIDATE_CHANGED");

  // Reivindicação da decisão evita duplo clique/duas aprovações simultâneas.
  // DISMISS é atômico; APPROVE grava idempotentemente a publicação e só então finaliza.
  if (input.decision === "DISMISS") {
    const changed = await prisma.djenReviewCandidate.updateMany({
      where: { id: candidate.id, organizationId: input.organizationId, status: "PENDING" },
      data: { status: "DISMISSED", decidedAt: new Date(), decidedByUserId: input.actorUserId },
    });
    if (!changed.count) throw new Error("DJEN_CANDIDATE_ALREADY_DECIDED");
  } else {
    // Não alterar estado do candidato antes do upsert seguro da publicação.
    const plan = await resolvePlan(input.organizationId);
    await persistPublication({ organizationId: input.organizationId,
      lawyerOabId: candidate.lawyerOabId, actorUserId: input.actorUserId, publication,
      allowEmail: hasCapability(plan, "notifications.email") });
    const changed = await prisma.djenReviewCandidate.updateMany({
      where: { id: candidate.id, organizationId: input.organizationId, status: "PENDING" },
      data: { status: "APPROVED", decidedAt: new Date(), decidedByUserId: input.actorUserId },
    });
    if (!changed.count) throw new Error("DJEN_CANDIDATE_ALREADY_DECIDED");
  }
  await prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId, actorUserId: input.actorUserId,
      category: "publications", action: input.decision === "APPROVE"
        ? "publication.identity_approved" : "publication.identity_dismissed",
      entityType: "djen_review_candidate", entityId: candidate.id,
      metadata: { lawyerOabId: candidate.lawyerOabId, externalKey: candidate.externalKey },
    },
  });
}

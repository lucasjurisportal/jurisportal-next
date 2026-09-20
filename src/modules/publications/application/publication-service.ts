import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { assertPublicationProcessCnjMatch } from "../domain/publication-link-policy";
import { normalizeCnjDigits } from "@/modules/processes/domain/cnj-number";

const PAGE_SIZE = 15;

function jsonStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function getPublicationSummary(organizationId: string) {
  const [total, unread, untreated, cancelled, pendingDeadlineReview] = await Promise.all([
    prisma.publication.count({ where: { organizationId } }),
    prisma.publication.count({ where: { organizationId, readAt: null } }),
    prisma.publication.count({ where: { organizationId, treatedAt: null } }),
    prisma.publication.count({ where: { organizationId, sourceStatus: "CANCELLED" } }),
    prisma.deadlineReview.count({ where: { organizationId, status: "PENDING_REVIEW" } }),
  ]);
  return { total, unread, untreated, cancelled, pendingDeadlineReview };
}

export async function getPublicationFilters(organizationId: string) {
  const [oabs, members] = await Promise.all([
    prisma.lawyerOab.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      include: { user: { select: { id: true, name: true } } },
    }),
    prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);
  return { oabs, members };
}

export async function listPublications(input: {
  organizationId: string;
  view?: string;
  query?: string;
  kind?: "PUBLICATION" | "INTIMATION";
  lawyerOabId?: string;
  responsibleUserId?: string;
  page?: number;
}) {
  const page = Math.max(1, input.page ?? 1);
  const where: Prisma.PublicationWhereInput = { organizationId: input.organizationId };

  if (input.view === "new") where.readAt = null;
  if (input.view === "untreated") where.treatedAt = null;
  if (input.view === "treated") where.treatedAt = { not: null };
  if (input.view === "with-date") where.deadlineReview = { is: { suggestedDate: { not: null } } };
  if (input.kind) where.kind = input.kind;
  if (input.lawyerOabId) where.recipients = { some: { lawyerOabId: input.lawyerOabId } };
  if (input.responsibleUserId) {
    where.recipients = {
      some: {
        ...(input.lawyerOabId ? { lawyerOabId: input.lawyerOabId } : {}),
        lawyerOab: { userId: input.responsibleUserId },
      },
    };
  }

  const query = input.query?.trim();
  if (query) {
    const cnj = normalizeCnjDigits(query);
    where.OR = [
      { communicationType: { contains: query, mode: "insensitive" } },
      { documentType: { contains: query, mode: "insensitive" } },
      { court: { contains: query, mode: "insensitive" } },
      { judicialBody: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
      { processNumberFormatted: { contains: query, mode: "insensitive" } },
      ...(cnj ? [{ processNumberNormalized: { contains: cnj } } as Prisma.PublicationWhereInput] : []),
      { process: { is: { subject: { contains: query, mode: "insensitive" } } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.publication.findMany({
      where,
      orderBy: [{ publicationDate: "desc" }, { capturedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        process: { select: { id: true, internalCode: true, cnjFormatted: true, subject: true, responsible: { select: { id: true, name: true } } } },
        recipients: {
          include: { lawyerOab: { include: { user: { select: { id: true, name: true } } } } },
          orderBy: { createdAt: "asc" },
        },
        deadlineReview: true,
      },
    }),
    prisma.publication.count({ where }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getPublicationDetail(organizationId: string, publicationId: string) {
  return prisma.publication.findFirst({
    where: { id: publicationId, organizationId },
    include: {
      process: {
        include: {
          responsible: { select: { id: true, name: true } },
          clients: { include: { client: { select: { id: true, name: true } } }, orderBy: { isPrimary: "desc" } },
        },
      },
      recipients: {
        include: { lawyerOab: { include: { user: { select: { id: true, name: true, email: true } } } } },
        orderBy: { createdAt: "asc" },
      },
      deadlineReview: { include: { workItem: true, confirmedBy: { select: { name: true } }, dismissedBy: { select: { name: true } } } },
      readBy: { select: { id: true, name: true } },
      treatedBy: { select: { id: true, name: true } },
    },
  });
}

export async function getPublicationActionOptions(organizationId: string) {
  const [processes, members] = await Promise.all([
    prisma.process.findMany({
      where: { organizationId },
      orderBy: { updatedAt: "desc" },
      take: 150,
      select: { id: true, internalCode: true, cnjFormatted: true, subject: true, status: true },
    }),
    prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);
  return { processes, members };
}

export async function markPublicationRead(input: { organizationId: string; publicationId: string; actorUserId: string }) {
  const publication = await prisma.publication.findFirst({
    where: { id: input.publicationId, organizationId: input.organizationId },
    select: { id: true, readAt: true },
  });
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  if (publication.readAt) return publication;
  return prisma.publication.update({
    where: { id: publication.id },
    data: { readAt: new Date(), readByUserId: input.actorUserId },
  });
}

export async function markPublicationTreated(input: { organizationId: string; publicationId: string; actorUserId: string }) {
  const publication = await prisma.publication.findFirst({
    where: { id: input.publicationId, organizationId: input.organizationId },
    select: { id: true, treatedAt: true },
  });
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  if (publication.treatedAt) return publication;

  return prisma.$transaction(async (tx) => {
    const updated = await tx.publication.update({
      where: { id: publication.id },
      data: {
        readAt: new Date(),
        readByUserId: input.actorUserId,
        treatedAt: new Date(),
        treatedByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "publications",
        action: "publication.treated",
        entityType: "publication",
        entityId: publication.id,
      },
    });
    return updated;
  });
}

export async function linkPublicationToProcess(input: {
  organizationId: string;
  publicationId: string;
  processId: string;
  actorUserId: string;
}) {
  const [publication, process] = await Promise.all([
    prisma.publication.findFirst({ where: { id: input.publicationId, organizationId: input.organizationId } }),
    prisma.process.findFirst({ where: { id: input.processId, organizationId: input.organizationId }, select: { id: true, cnjFormatted: true, cnjNormalized: true } }),
  ]);
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  if (!process) throw new Error("PROCESS_NOT_FOUND");
  if (publication.processId === process.id) return publication;
  assertPublicationProcessCnjMatch({ publicationCnjNormalized: publication.processNumberNormalized, processCnjNormalized: process.cnjNormalized });

  return prisma.$transaction(async (tx) => {
    const updated = await tx.publication.update({ where: { id: publication.id }, data: { processId: process.id } });
    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: process.id,
        kind: publication.kind === "INTIMATION" ? "INTIMATION_RECEIVED" : "PUBLICATION_RECEIVED",
        title: publication.kind === "INTIMATION" ? "Intimação vinculada" : "Publicação vinculada",
        description: `${publication.communicationType} · DJeN`,
        source: "DJEN",
        createdByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "publications",
        action: "publication.process_linked",
        entityType: "publication",
        entityId: publication.id,
        metadata: { processId: process.id, cnj: process.cnjFormatted },
      },
    });
    return updated;
  });
}

export async function confirmPublicationDeadline(input: {
  organizationId: string;
  publicationId: string;
  actorUserId: string;
  title: string;
  dueDate: string;
}) {
  const publication = await prisma.publication.findFirst({
    where: { id: input.publicationId, organizationId: input.organizationId },
    include: {
      deadlineReview: true,
      process: { select: { id: true, responsibleUserId: true } },
      recipients: { include: { lawyerOab: { select: { userId: true } } }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  if (!publication.process) throw new Error("PUBLICATION_PROCESS_REQUIRED");
  if (!publication.deadlineReview) throw new Error("DEADLINE_REVIEW_NOT_FOUND");
  if (publication.deadlineReview.status !== "PENDING_REVIEW") throw new Error("DEADLINE_REVIEW_ALREADY_RESOLVED");

  const responsibleUserId = publication.process.responsibleUserId
    ?? publication.recipients[0]?.lawyerOab.userId
    ?? input.actorUserId;

  return prisma.$transaction(async (tx) => {
    const item = await tx.processWorkItem.create({
      data: {
        organizationId: input.organizationId,
        processId: publication.process!.id,
        kind: "DEADLINE",
        title: input.title.trim(),
        dueDate: dateOnly(input.dueDate),
        responsibleUserId,
        priority: "NORMAL",
        isFatal: false,
        status: "OPEN",
        origin: publication.kind === "INTIMATION" ? "INTIMATION" : "PUBLICATION",
        notes: `Confirmado manualmente a partir da comunicação DJeN ${publication.id}.`,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.deadlineReview.update({
      where: { id: publication.deadlineReview!.id },
      data: {
        status: "CONFIRMED",
        title: input.title.trim(),
        confirmedDate: dateOnly(input.dueDate),
        confirmedByUserId: input.actorUserId,
        confirmedAt: new Date(),
        workItemId: item.id,
      },
    });

    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: publication.process!.id,
        kind: "DEADLINE_CREATED",
        title: "Prazo confirmado a partir de publicação",
        description: input.title.trim(),
        source: "DJEN",
        createdByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "publications",
        action: "publication.deadline_confirmed",
        entityType: "publication",
        entityId: publication.id,
        metadata: { processId: publication.process!.id, workItemId: item.id, dueDate: input.dueDate },
      },
    });

    return item;
  });
}

export async function dismissPublicationDeadlineReview(input: {
  organizationId: string;
  publicationId: string;
  actorUserId: string;
}) {
  const review = await prisma.deadlineReview.findFirst({
    where: { organizationId: input.organizationId, publicationId: input.publicationId },
  });
  if (!review) throw new Error("DEADLINE_REVIEW_NOT_FOUND");
  if (review.status !== "PENDING_REVIEW") throw new Error("DEADLINE_REVIEW_ALREADY_RESOLVED");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.deadlineReview.update({
      where: { id: review.id },
      data: { status: "DISMISSED", dismissedByUserId: input.actorUserId, dismissedAt: new Date() },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "publications",
        action: "publication.deadline_review_dismissed",
        entityType: "publication",
        entityId: input.publicationId,
      },
    });
    return updated;
  });
}

export async function createTaskFromPublication(input: {
  organizationId: string;
  publicationId: string;
  actorUserId: string;
  title: string;
  dueDate?: string;
  responsibleUserId?: string;
}) {
  const publication = await prisma.publication.findFirst({
    where: { id: input.publicationId, organizationId: input.organizationId },
    include: {
      process: { select: { id: true, responsibleUserId: true } },
      recipients: { include: { lawyerOab: { select: { userId: true } } }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!publication) throw new Error("PUBLICATION_NOT_FOUND");
  if (!publication.process) throw new Error("PUBLICATION_PROCESS_REQUIRED");

  if (input.responsibleUserId) {
    const member = await prisma.member.findFirst({ where: { organizationId: input.organizationId, userId: input.responsibleUserId }, select: { id: true } });
    if (!member) throw new Error("PROCESS_RESPONSIBLE_INVALID");
  }

  const responsibleUserId = input.responsibleUserId
    || publication.process.responsibleUserId
    || publication.recipients[0]?.lawyerOab.userId
    || input.actorUserId;

  return prisma.$transaction(async (tx) => {
    const item = await tx.processWorkItem.create({
      data: {
        organizationId: input.organizationId,
        processId: publication.process!.id,
        kind: "TASK",
        title: input.title.trim(),
        dueDate: input.dueDate ? dateOnly(input.dueDate) : null,
        responsibleUserId,
        priority: "NORMAL",
        isFatal: false,
        status: "OPEN",
        origin: publication.kind === "INTIMATION" ? "INTIMATION" : "PUBLICATION",
        notes: `Criada a partir da comunicação DJeN ${publication.id}.`,
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });
    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: publication.process!.id,
        kind: "TASK_CREATED",
        title: "Tarefa criada a partir de publicação",
        description: input.title.trim(),
        source: "DJEN",
        createdByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "publications",
        action: "publication.task_created",
        entityType: "publication",
        entityId: publication.id,
        metadata: { processId: publication.process!.id, workItemId: item.id, dueDate: input.dueDate ?? null },
      },
    });
    return item;
  });
}

export async function listProcessPublications(organizationId: string, processId: string) {
  return prisma.publication.findMany({
    where: { organizationId, processId },
    orderBy: [{ publicationDate: "desc" }, { capturedAt: "desc" }],
    include: {
      recipients: { include: { lawyerOab: { include: { user: { select: { name: true } } } } } },
      deadlineReview: true,
    },
  });
}

export { jsonStringArray };

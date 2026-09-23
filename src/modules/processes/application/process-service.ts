import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import type { PlanLimit } from "@/modules/plans/domain/plan.types";
import { formatCnjNumber, normalizeCnjDigits } from "../domain/cnj-number";
import { formatInternalProcessCode, saoPauloYear } from "../domain/process-reference";
import { assertCnjMutationAllowed } from "../domain/process-identity-policy";
import { assertProcessCapacity } from "../domain/process-policy";
import { canPermanentlyDeleteProcess } from "../domain/process-delete-policy";
import type { ProcessInput } from "../domain/process.schema";
import { removeGoogleCalendarLinksForSources } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

const PAGE_SIZE = 10;
const ALLOWED_STATUSES = new Set(["ACTIVE", "CLOSED", "ARCHIVED", "FOUND"]);

function optional(value?: string | null): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function dateFromInput(value?: string): Date | null {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function distinctClientIds(data: ProcessInput): string[] {
  return [...new Set([data.primaryClientId, ...data.additionalClientIds])];
}

async function assertRelatedEntities(input: {
  organizationId: string;
  data: ProcessInput;
}) {
  const clientIds = distinctClientIds(input.data);
  const clients = await prisma.client.findMany({
    where: { organizationId: input.organizationId, id: { in: clientIds } },
    select: { id: true },
  });
  if (clients.length !== clientIds.length) throw new Error("PROCESS_CLIENT_INVALID");

  if (input.data.responsibleUserId) {
    const member = await prisma.member.findFirst({
      where: {
        organizationId: input.organizationId,
        userId: input.data.responsibleUserId,
      },
      select: { id: true },
    });
    if (!member) throw new Error("PROCESS_RESPONSIBLE_INVALID");
  }
}

function processIdentityPersistence(input: ProcessInput) {
  const digits = normalizeCnjDigits(input.cnj);
  return {
    cnjRaw: input.cnj.trim(),
    cnjNormalized: digits,
    cnjFormatted: formatCnjNumber(digits),
  };
}

function processMutablePersistence(input: ProcessInput) {
  return {
    court: optional(input.court),
    division: optional(input.division),
    district: optional(input.district),
    forum: optional(input.forum),
    processClass: optional(input.processClass),
    subject: optional(input.subject),
    caseValue: input.caseValue ?? null,
    distributionDate: dateFromInput(input.distributionDate),
    responsibleUserId: input.responsibleUserId || null,
    notes: optional(input.notes),
  };
}

async function issueInternalProcessCode(tx: Prisma.TransactionClient, organizationId: string, now = new Date()) {
  const year = saoPauloYear(now);
  const sequence = await tx.processNumberSequence.upsert({
    where: { organizationId_year: { organizationId, year } },
    create: { organizationId, year, lastValue: 1 },
    update: { lastValue: { increment: 1 } },
    select: { lastValue: true },
  });
  return {
    internalYear: year,
    internalSequence: sequence.lastValue,
    internalCode: formatInternalProcessCode(year, sequence.lastValue),
  };
}

const listInclude = {
  responsible: { select: { id: true, name: true, email: true } },
  clients: {
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: { client: { select: { id: true, name: true, tradeName: true, kind: true, status: true } } },
  },
  parties: {
    orderBy: [{ createdAt: "asc" }],
    take: 1,
    select: { id: true, name: true, role: true },
  },
  _count: { select: { parties: true, timeline: true } },
} satisfies Prisma.ProcessInclude;

export async function listProcesses(input: {
  organizationId: string;
  page?: number;
  query?: string;
  status?: "ACTIVE" | "CLOSED" | "ARCHIVED" | "FOUND";
  responsibleUserId?: string;
}) {
  const page = Math.max(1, input.page ?? 1);
  const query = input.query?.trim();
  const queryDigits = query ? normalizeCnjDigits(query) : "";

  const where: Prisma.ProcessWhereInput = {
    organizationId: input.organizationId,
    ...(input.status ? { status: input.status } : {}),
    ...(input.responsibleUserId ? { responsibleUserId: input.responsibleUserId } : {}),
    ...(query
      ? {
          OR: [
            { internalCode: { contains: query, mode: "insensitive" } },
            { cnjFormatted: { contains: query, mode: "insensitive" } },
            ...(queryDigits ? [{ cnjNormalized: { contains: queryDigits } } as Prisma.ProcessWhereInput] : []),
            { subject: { contains: query, mode: "insensitive" } },
            { processClass: { contains: query, mode: "insensitive" } },
            { court: { contains: query, mode: "insensitive" } },
            { district: { contains: query, mode: "insensitive" } },
            { clients: { some: { client: { name: { contains: query, mode: "insensitive" } } } } },
            { clients: { some: { client: { tradeName: { contains: query, mode: "insensitive" } } } } },
            { parties: { some: { name: { contains: query, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };

  const [total, items] = await prisma.$transaction([
    prisma.process.count({ where }),
    prisma.process.findMany({
      where,
      include: listInclude,
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getProcess(organizationId: string, processId: string) {
  return prisma.process.findFirst({
    where: { id: processId, organizationId },
    include: {
      responsible: { select: { id: true, name: true, email: true } },
      clients: {
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        include: { client: true },
      },
      parties: { orderBy: [{ role: "asc" }, { name: "asc" }] },
      timeline: {
        orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
        take: 100,
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function getProcessFormOptions(organizationId: string) {
  const [clients, members] = await Promise.all([
    prisma.client.findMany({
      where: { organizationId },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, tradeName: true, kind: true, taxIdNormalized: true, status: true },
    }),
    prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  return { clients, members };
}


export async function getProcessResponsibleOptions(organizationId: string) {
  return prisma.member.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
}

export async function getProcessCounts(organizationId: string) {
  const [total, active, closed, archived, found] = await Promise.all([
    prisma.process.count({ where: { organizationId } }),
    prisma.process.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.process.count({ where: { organizationId, status: "CLOSED" } }),
    prisma.process.count({ where: { organizationId, status: "ARCHIVED" } }),
    prisma.process.count({ where: { organizationId, status: "FOUND" } }),
  ]);
  return { total, active, closed, archived, found };
}

export async function createProcess(input: {
  organizationId: string;
  actorUserId: string;
  processLimit: PlanLimit;
  data: ProcessInput;
  source?: "MANUAL" | "IMPORT";
}) {
  await assertRelatedEntities({ organizationId: input.organizationId, data: input.data });
  const cnjNormalized = normalizeCnjDigits(input.data.cnj);

  const clientIds = distinctClientIds(input.data);

  return prisma.$transaction(async (tx) => {
    // Uma trava no registro do escritório serializa cadastros manuais e importações,
    // inclusive quando chegam de servidores diferentes. FOR NO KEY UPDATE evita
    // bloquear verificações normais de FK (KEY SHARE). A consulta retorna UUID,
    // evitando o problema de desserialização do tipo void do Prisma.
    // A contagem DEVE ocorrer depois da trava e DENTRO desta transação: caso dois
    // usuários disputem a última vaga, o segundo enxergará o primeiro cadastro.
    const lockedOrganization = await tx.$queryRaw<{ id: string }[]>`
      SELECT "id" FROM "organization"
      WHERE "id" = ${input.organizationId}::uuid
      FOR NO KEY UPDATE
    `;
    if (lockedOrganization.length === 0) throw new Error("PROCESS_ORGANIZATION_NOT_FOUND");

    const count = await tx.process.count({ where: { organizationId: input.organizationId } });
    assertProcessCapacity(count, input.processLimit);

    const duplicate = await tx.process.findUnique({
      where: {
        organizationId_cnjNormalized: {
          organizationId: input.organizationId,
          cnjNormalized,
        },
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("PROCESS_DUPLICATE_CNJ");

    const reference = await issueInternalProcessCode(tx, input.organizationId);
    const process = await tx.process.create({
      data: {
        organizationId: input.organizationId,
        ...processIdentityPersistence(input.data),
        ...processMutablePersistence(input.data),
        ...reference,
        cnjLockedAt: new Date(),
        cnjLockedByUserId: input.actorUserId,
        source: input.source ?? "MANUAL",
        status: "ACTIVE",
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.processClient.createMany({
      data: clientIds.map((clientId) => ({
        organizationId: input.organizationId,
        processId: process.id,
        clientId,
        isPrimary: clientId === input.data.primaryClientId,
      })),
    });

    if (input.data.parties.length > 0) {
      await tx.processParty.createMany({
        data: input.data.parties.map((party) => ({
          organizationId: input.organizationId,
          processId: process.id,
          name: party.name.trim(),
          role: party.role.trim(),
          document: optional(party.document),
        })),
      });
    }

    const pendingPublications = await tx.publication.findMany({
      where: {
        organizationId: input.organizationId,
        processId: null,
        processNumberNormalized: cnjNormalized,
      },
      select: { id: true, kind: true, communicationType: true, summary: true },
    });

    if (pendingPublications.length > 0) {
      await tx.publication.updateMany({
        where: { id: { in: pendingPublications.map((item) => item.id) }, organizationId: input.organizationId, processId: null },
        data: { processId: process.id },
      });
      await tx.processTimelineEvent.createMany({
        data: pendingPublications.map((publication) => ({
          organizationId: input.organizationId,
          processId: process.id,
          kind: publication.kind === "INTIMATION" ? "INTIMATION_RECEIVED" : "PUBLICATION_RECEIVED",
          title: publication.kind === "INTIMATION" ? "Intimação vinculada automaticamente" : "Publicação vinculada automaticamente",
          description: `${publication.communicationType} · DJeN · ${publication.summary || "Vinculada após cadastro do processo"}`,
          source: "DJEN",
          createdByUserId: input.actorUserId,
        })),
      });
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          category: "publications",
          action: "process.publications_auto_linked",
          entityType: "process",
          entityId: process.id,
          metadata: { publicationCount: pendingPublications.length, cnj: process.cnjFormatted },
        },
      });
    }

    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: process.id,
        kind: "PROCESS_CREATED",
        title: "Processo cadastrado no Jurisportal",
        description: input.source === "IMPORT" ? "Processo importado de arquivo pelo escritório." : "Cadastro manual criado pelo escritório.",
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: "process.created",
        entityType: "process",
        entityId: process.id,
        metadata: { cnjLast4: cnjNormalized.slice(-4), internalCode: process.internalCode, source: input.source ?? "MANUAL" },
      },
    });

    return process;
  }, {
    // PostgreSQL usa READ COMMITTED: a contagem executada após aguardar a trava
    // observa os cadastros que já foram confirmados por outra transação.
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 15_000,
    timeout: 30_000,
  });
}

export async function updateProcess(input: {
  organizationId: string;
  actorUserId: string;
  processId: string;
  data: ProcessInput;
  allowCnjChange?: boolean;
  cnjCorrectionReason?: string;
}) {
  const current = await prisma.process.findFirst({
    where: { id: input.processId, organizationId: input.organizationId },
  });
  if (!current) throw new Error("PROCESS_NOT_FOUND");

  await assertRelatedEntities({ organizationId: input.organizationId, data: input.data });
  const cnjNormalized = normalizeCnjDigits(input.data.cnj);
  const cnjChanged = assertCnjMutationAllowed({
    currentNormalized: current.cnjNormalized,
    requestedNormalized: cnjNormalized,
    allowMasterCorrection: input.allowCnjChange,
    correctionReason: input.cnjCorrectionReason,
  });

  if (cnjChanged) {
    const duplicate = await prisma.process.findFirst({
      where: {
        organizationId: input.organizationId,
        cnjNormalized,
        NOT: { id: input.processId },
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("PROCESS_DUPLICATE_CNJ");
  }

  const clientIds = distinctClientIds(input.data);

  return prisma.$transaction(async (tx) => {
    const process = await tx.process.update({
      where: { id: input.processId },
      data: {
        ...processMutablePersistence(input.data),
        ...(cnjChanged
          ? {
              ...processIdentityPersistence(input.data),
              cnjLockedAt: new Date(),
              cnjLockedByUserId: input.actorUserId,
            }
          : {}),
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.processClient.deleteMany({ where: { processId: input.processId } });
    await tx.processClient.createMany({
      data: clientIds.map((clientId) => ({
        organizationId: input.organizationId,
        processId: input.processId,
        clientId,
        isPrimary: clientId === input.data.primaryClientId,
      })),
    });

    await tx.processParty.deleteMany({ where: { processId: input.processId } });
    if (input.data.parties.length > 0) {
      await tx.processParty.createMany({
        data: input.data.parties.map((party) => ({
          organizationId: input.organizationId,
          processId: input.processId,
          name: party.name.trim(),
          role: party.role.trim(),
          document: optional(party.document),
        })),
      });
    }

    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: "PROCESS_UPDATED",
        title: "Dados do processo atualizados",
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });

    if (cnjChanged) {
      await tx.processTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          processId: input.processId,
          kind: "PROCESS_CNJ_CORRECTED",
          title: "Número CNJ corrigido pelo administrador mestre",
          description: input.cnjCorrectionReason?.trim() || null,
          source: "PLATFORM_MASTER",
          createdByUserId: input.actorUserId,
        },
      });
    }

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: "process.updated",
        entityType: "process",
        entityId: input.processId,
      },
    });

    if (cnjChanged) {
      await tx.auditEvent.create({
        data: {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          category: "processes",
          action: "process.cnj_corrected",
          entityType: "process",
          entityId: input.processId,
          metadata: {
            previousCnj: current.cnjFormatted,
            newCnj: process.cnjFormatted,
            reason: input.cnjCorrectionReason?.trim(),
            scope: "PLATFORM_MASTER_JURISPORTAL_INTERNAL",
          },
        },
      });
    }

    return process;
  });
}

export async function changeProcessStatus(input: {
  organizationId: string;
  actorUserId: string;
  processId: string;
  status: string;
}) {
  if (!ALLOWED_STATUSES.has(input.status)) throw new Error("PROCESS_STATUS_INVALID");
  const current = await prisma.process.findFirst({
    where: { id: input.processId, organizationId: input.organizationId },
  });
  if (!current) throw new Error("PROCESS_NOT_FOUND");
  if (current.status === input.status) return current;

  const now = new Date();
  const labels: Record<string, string> = {
    ACTIVE: "Processo reativado",
    CLOSED: "Processo encerrado",
    ARCHIVED: "Processo arquivado",
    FOUND: "Processo marcado como encontrado",
  };

  return prisma.$transaction(async (tx) => {
    const process = await tx.process.update({
      where: { id: input.processId },
      data: {
        status: input.status,
        archivedAt: input.status === "ARCHIVED" ? now : null,
        closedAt: input.status === "CLOSED" ? now : null,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: "STATUS_CHANGED",
        title: labels[input.status] ?? "Status alterado",
        description: `${current.status} → ${input.status}`,
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: "process.status_changed",
        entityType: "process",
        entityId: input.processId,
        metadata: { from: current.status, to: input.status },
      },
    });

    return process;
  });
}


export async function deleteProcessPermanently(input: {
  organizationId: string;
  actorUserId: string;
  processId: string;
}) {
  const [platformAdmin, organization, process] = await Promise.all([
    prisma.platformAdmin.findUnique({
      where: { userId: input.actorUserId },
      select: { active: true, role: true },
    }),
    prisma.organization.findUnique({
      where: { id: input.organizationId },
      select: { slug: true },
    }),
    prisma.process.findFirst({
      where: { id: input.processId, organizationId: input.organizationId },
      select: { id: true, cnjNormalized: true, status: true, workItems: { select: { id: true } }, agendaEvents: { select: { id: true } } },
    }),
  ]);

  if (!process) throw new Error("PROCESS_NOT_FOUND");

  const allowed = canPermanentlyDeleteProcess({
    isPlatformMaster: Boolean(platformAdmin?.active && platformAdmin.role === "PLATFORM_MASTER"),
    organizationSlug: organization?.slug ?? "",
  });
  if (!allowed) throw new Error("PROCESS_DELETE_FORBIDDEN");

  // Exclusão permanente só existe no ambiente interno. Antes de apagar o processo,
  // tentamos remover projeções já enviadas ao Google Calendar para não deixar lixo externo.
  try {
    await removeGoogleCalendarLinksForSources({
      organizationId: input.organizationId,
      sources: [
        ...process.workItems.map((item) => ({ sourceType: "WORK_ITEM" as const, sourceId: item.id })),
        ...process.agendaEvents.map((event) => ({ sourceType: "AGENDA_EVENT" as const, sourceId: event.id })),
      ],
    });
  } catch (error) {
    console.warn("[process.delete.google-calendar-cleanup]", error);
  }

  await prisma.$transaction(async (tx) => {
    // A auditoria fica antes da exclusão. ProcessClient, ProcessParty e Timeline
    // são removidos por CASCADE, mas o evento de auditoria não depende do processo.
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: "process.deleted_permanently",
        entityType: "process",
        entityId: process.id,
        metadata: {
          cnjLast4: process.cnjNormalized.slice(-4),
          previousStatus: process.status,
          scope: "JURISPORTAL_INTERNAL_ONLY",
        },
      },
    });

    await tx.process.delete({ where: { id: process.id } });
  });
}

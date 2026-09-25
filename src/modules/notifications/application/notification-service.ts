import { prisma } from "@/infrastructure/database/prisma";
import { saoPauloTodayString } from "@/modules/work-items/domain/work-item-date";
import { notificationBucket, type NotificationBucket } from "@/modules/notifications/domain/notification-buckets";

export type AppNotification = {
  id: string;
  kind: "publication" | "deadline" | "task" | "agenda";
  title: string;
  description: string;
  href: string;
  createdAt: Date;
  read: boolean;
  bucket: NotificationBucket;
};

function startOfTodayUtc() {
  return new Date(`${saoPauloTodayString()}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function formatDate(date: Date | null) {
  if (!date) return "sem data";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function workItemDescription(item: { dueDate: Date | null; dueTime: string | null; process: { internalCode: string } }) {
  const date = formatDate(item.dueDate);
  return `${item.process.internalCode} · ${date}${item.dueTime ? ` às ${item.dueTime}` : ""}`;
}

export async function getNotifications(input: {
  organizationId: string;
  userId: string;
  role: string;
  take?: number;
}) {
  const today = startOfTodayUtc();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 8);
  const now = new Date();
  // Sem corte de 14 dias: pendências antigas continuam disponíveis no sino.
  // Em carteiras muito grandes, sinalizamos truncamento e preservamos acesso à lista completa.
  const assignedWhere = input.role === "owner"
    ? {}
    : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] };

  const [publications, workItems, agendaEvents, pendingIdentity] = await Promise.all([
    prisma.publication.findMany({
      where: {
        organizationId: input.organizationId,
        sourceStatus: "ACTIVE",
        treatedAt: null,
        ...(input.role === "owner" ? {} : { recipients: { some: { lawyerOab: { userId: input.userId, organizationId: input.organizationId } } } }),
      },
      select: {
        id: true,
        kind: true,
        communicationType: true,
        processNumberFormatted: true,
        capturedAt: true,
        process: { select: { internalCode: true } },
      },
      orderBy: [{ capturedAt: "desc" }],
      take: 251,
    }),
    prisma.processWorkItem.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        dueDate: { not: null, lt: nextWeek },
        ...assignedWhere,
      },
      select: {
        id: true,
        kind: true,
        title: true,
        dueDate: true,
        dueTime: true,
        isFatal: true,
        updatedAt: true,
        createdAt: true,
        process: { select: { id: true, internalCode: true } },
      },
      orderBy: [{ dueDate: "asc" }, { isFatal: "desc" }, { updatedAt: "desc" }],
      take: 251,
    }),
    prisma.agendaEvent.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        eventDate: { lt: nextWeek },
        ...(input.role === "owner" ? {} : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] }),
      },
      select: { id: true, type: true, title: true, eventDate: true, startTime: true, createdAt: true, processId: true },
      orderBy: [{ createdAt: "desc" }],
      take: 251,
    }),
    input.role === "owner" ? prisma.djenReviewCandidate.findMany({
      where: { organizationId: input.organizationId, status: "PENDING" },
      orderBy: { firstSeenAt: "desc" }, take: 251,
      select: { id: true, firstSeenAt: true,
        lawyerOab: { select: { user: { select: { name: true } }, rawNumber: true, state: true } } },
    }) : Promise.resolve([]),
  ]);

  const truncated = [publications, workItems, agendaEvents, pendingIdentity].some((items) => items.length > 250);
  const candidates: Omit<AppNotification, "read" | "bucket">[] = [];

  for (const item of publications.slice(0, 250)) {
    candidates.push({
      id: `publication:${item.id}`,
      kind: "publication",
      title: item.kind === "INTIMATION" ? "Nova intimação para revisar" : "Nova publicação para revisar",
      description: `${item.process?.internalCode || item.processNumberFormatted || "Comunicação sem processo vinculado"} · ${item.communicationType}`,
      href: `/app/publicacoes/${item.id}`,
      createdAt: item.capturedAt,
    });
  }

  for (const item of pendingIdentity.slice(0, 250)) {
    candidates.push({
      id: `review:${item.id}`, kind: "publication", title: "Publicação para confirmar",
      description: `${item.lawyerOab.user.name} · ${item.lawyerOab.rawNumber}/${item.lawyerOab.state}`,
      href: `/app/publicacoes/revisao#${item.id}`,
      createdAt: item.firstSeenAt,
    });
  }

  for (const item of workItems.slice(0, 250)) {
    const overdue = !!item.dueDate && item.dueDate < today;
    const dueToday = !!item.dueDate && item.dueDate >= today && item.dueDate < tomorrow;
    candidates.push({
      id: `work:${item.id}`,
      kind: item.kind === "DEADLINE" ? "deadline" : "task",
      title: overdue
        ? `${item.kind === "DEADLINE" ? "Prazo" : "Tarefa"} em atraso`
        : dueToday
          ? `${item.kind === "DEADLINE" ? "Prazo" : "Tarefa"} para hoje`
          : `${item.kind === "DEADLINE" ? "Prazo" : "Tarefa"} próximo`,
      description: `${item.title} · ${workItemDescription(item)}`,
      href: `/app/processos/${item.process.id}?tab=prazos`,
      createdAt: item.createdAt,
    });
  }

  for (const item of agendaEvents.slice(0, 250)) {
    candidates.push({
      id: `agenda:${item.id}`,
      kind: "agenda",
      title: item.type === "HEARING" ? "Audiência próxima" : "Compromisso próximo",
      description: `${item.title} · ${formatDate(item.eventDate)}${item.startTime ? ` às ${item.startTime}` : ""}`,
      href: item.processId ? `/app/processos/${item.processId}` : "/app/agenda",
      createdAt: item.createdAt,
    });
  }

  candidates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const ids = candidates.map((item) => item.id);
  const readEvents = ids.length
    ? await prisma.auditEvent.findMany({
        where: {
          organizationId: input.organizationId,
          actorUserId: input.userId,
          action: "notification.read",
          entityType: "notification",
          entityId: { in: ids },
        },
        select: { entityId: true },
      })
    : [];
  const readIds = new Set(readEvents.map((event) => event.entityId).filter((value): value is string => !!value));
  const notifications: AppNotification[] = candidates.map((item) => {
    const read = readIds.has(item.id);
    const bucket = notificationBucket({ createdAt: item.createdAt, read }, now);
    const title = bucket !== "new" && item.id.startsWith("publication:")
      ? (item.title.startsWith("Nova intimação") ? "Intimação pendente de análise" : "Publicação pendente de análise")
      : item.title;
    return { ...item, title, read, bucket };
  });
  const take = Math.max(1, Math.min(input.take ?? 20, 30));
  const groups: Record<NotificationBucket, AppNotification[]> = { new: [], pending: [], late: [] };
  const counts: Record<NotificationBucket, number> = { new: 0, pending: 0, late: 0 };
  for (const item of notifications) {
    counts[item.bucket]++;
    if (groups[item.bucket].length < take) groups[item.bucket].push(item);
  }
  return {
    notifications: [...groups.new, ...groups.pending, ...groups.late],
    counts,
    unreadCount: notifications.filter((item) => !item.read).length,
    truncated,
    // Os registros não somem por idade; a lista integral permanece nos módulos de origem.
  };
}

export async function markNotificationsRead(input: {
  organizationId: string;
  userId: string;
  ids: string[];
  role: string;
}) {
  const ids = Array.from(new Set(input.ids.filter((id) => /^(publication|review|work|agenda):[0-9a-f-]{8,}$/i.test(id)))).slice(0, 30);
  if (!ids.length) return { marked: 0 };
  // Verifica a autorização no servidor para CADA ID, inclusive após outro lote ter mudado
  // de Novos para Pendentes. Não aceita IDs adivinhados de outros escritórios.
  const byKind = (kind: string) => ids.filter((id) => id.startsWith(`${kind}:`)).map((id) => id.slice(kind.length + 1));
  const today = startOfTodayUtc();
  const nextWeek = addDays(today, 8);
  const [publications, reviews, work, agenda] = await Promise.all([
    prisma.publication.findMany({
      where: {
        id: { in: byKind("publication") }, organizationId: input.organizationId,
        sourceStatus: "ACTIVE", treatedAt: null,
        ...(input.role === "owner" ? {} : { recipients: { some: { lawyerOab: { userId: input.userId, organizationId: input.organizationId } } } }),
      }, select: { id: true },
    }),
    input.role === "owner" ? prisma.djenReviewCandidate.findMany({
      where: { id: { in: byKind("review") }, organizationId: input.organizationId, status: "PENDING" },
      select: { id: true },
    }) : Promise.resolve([]),
    prisma.processWorkItem.findMany({
      where: {
        id: { in: byKind("work") }, organizationId: input.organizationId, status: "OPEN",
        dueDate: { not: null, lt: nextWeek },
        ...(input.role === "owner" ? {} : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] }),
      }, select: { id: true },
    }),
    prisma.agendaEvent.findMany({
      where: {
        id: { in: byKind("agenda") }, organizationId: input.organizationId, status: "OPEN",
        eventDate: { lt: nextWeek },
        ...(input.role === "owner" ? {} : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] }),
      }, select: { id: true },
    }),
  ]);
  const permitted = new Set([
    ...publications.map((item) => `publication:${item.id}`),
    ...reviews.map((item) => `review:${item.id}`),
    ...work.map((item) => `work:${item.id}`),
    ...agenda.map((item) => `agenda:${item.id}`),
  ]);
  const allowedIds = ids.filter((id) => permitted.has(id));
  if (!allowedIds.length) return { marked: 0 };

  const existing = await prisma.auditEvent.findMany({
    where: {
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: "notification.read",
      entityType: "notification",
      entityId: { in: allowedIds },
    },
    select: { entityId: true },
  });
  const existingIds = new Set(existing.map((event) => event.entityId));
  const newIds = allowedIds.filter((id) => !existingIds.has(id));
  if (newIds.length) {
    await prisma.auditEvent.createMany({
      data: newIds.map((id) => ({
        organizationId: input.organizationId,
        actorUserId: input.userId,
        category: "notifications",
        action: "notification.read",
        entityType: "notification",
        entityId: id,
      })),
    });
  }
  return { marked: newIds.length };
}

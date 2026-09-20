import { prisma } from "@/infrastructure/database/prisma";
import { saoPauloTodayString } from "@/modules/work-items/domain/work-item-date";

export type AppNotification = {
  id: string;
  kind: "publication" | "deadline" | "task" | "agenda";
  title: string;
  description: string;
  href: string;
  createdAt: Date;
  read: boolean;
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
  const publicationSince = addDays(today, -14);
  const assignedWhere = input.role === "owner"
    ? {}
    : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] };

  const [publications, workItems, agendaEvents] = await Promise.all([
    prisma.publication.findMany({
      where: {
        organizationId: input.organizationId,
        sourceStatus: "ACTIVE",
        treatedAt: null,
        publicationDate: { gte: publicationSince },
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
      take: 8,
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
        process: { select: { id: true, internalCode: true } },
      },
      orderBy: [{ dueDate: "asc" }, { isFatal: "desc" }, { updatedAt: "desc" }],
      take: 10,
    }),
    prisma.agendaEvent.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        eventDate: { gte: today, lt: nextWeek },
        ...(input.role === "owner" ? {} : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] }),
      },
      select: { id: true, type: true, title: true, eventDate: true, startTime: true, createdAt: true, processId: true },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      take: 6,
    }),
  ]);

  const candidates: Omit<AppNotification, "read">[] = [];

  for (const item of publications) {
    candidates.push({
      id: `publication:${item.id}`,
      kind: "publication",
      title: item.kind === "INTIMATION" ? "Nova intimação para revisar" : "Nova publicação para revisar",
      description: `${item.process?.internalCode || item.processNumberFormatted || "Comunicação sem processo vinculado"} · ${item.communicationType}`,
      href: `/app/publicacoes/${item.id}`,
      createdAt: item.capturedAt,
    });
  }

  for (const item of workItems) {
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
      createdAt: item.updatedAt,
    });
  }

  for (const item of agendaEvents) {
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
  const selected = candidates.slice(0, Math.max(1, Math.min(input.take ?? 8, 20)));
  const ids = selected.map((item) => item.id);
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
  const notifications: AppNotification[] = selected.map((item) => ({ ...item, read: readIds.has(item.id) }));

  return { notifications, unreadCount: notifications.filter((item) => !item.read).length };
}

export async function markNotificationsRead(input: {
  organizationId: string;
  userId: string;
  ids: string[];
}) {
  const ids = Array.from(new Set(input.ids.filter((id) => /^(publication|work|agenda):[0-9a-f-]{8,}$/i.test(id)))).slice(0, 30);
  if (!ids.length) return { marked: 0 };

  const existing = await prisma.auditEvent.findMany({
    where: {
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: "notification.read",
      entityType: "notification",
      entityId: { in: ids },
    },
    select: { entityId: true },
  });
  const existingIds = new Set(existing.map((event) => event.entityId));
  const newIds = ids.filter((id) => !existingIds.has(id));
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

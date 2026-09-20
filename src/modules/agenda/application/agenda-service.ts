import { prisma } from "@/infrastructure/database/prisma";
import { getWorkItemFormOptions } from "@/modules/work-items/application/work-item-service";
import { saoPauloTodayString } from "@/modules/work-items/domain/work-item-date";
import type { AgendaEventInput } from "../domain/agenda-event.schema";

function optional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function toDate(dateString: string) {
  return new Date(`${dateString}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthBounds(date: Date) {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  return { start, end };
}

export function resolveAgendaRange(view = "today", anchorString?: string) {
  const safeAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchorString ?? "") ? anchorString! : saoPauloTodayString();
  const anchor = toDate(safeAnchor);
  if (view === "month") {
    const { start, end } = monthBounds(anchor);
    return { start, end, anchorString: safeAnchor };
  }
  if (view === "week") return { start: anchor, end: addDays(anchor, 7), anchorString: safeAnchor };
  return { start: anchor, end: addDays(anchor, 1), anchorString: safeAnchor };
}

export async function getAgendaOptions(organizationId: string) {
  return getWorkItemFormOptions(organizationId);
}

export async function listAgenda(input: {
  organizationId: string;
  view?: string;
  anchor?: string;
  responsibleUserId?: string;
}) {
  const range = resolveAgendaRange(input.view, input.anchor);
  const responsible = input.responsibleUserId || undefined;
  const [workItems, events] = await Promise.all([
    prisma.processWorkItem.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        dueDate: { gte: range.start, lt: range.end },
        ...(responsible ? { responsibleUserId: responsible } : {}),
      },
      include: {
        process: {
          select: {
            id: true, cnjFormatted: true, subject: true,
            clients: { where: { isPrimary: true }, take: 1, select: { client: { select: { name: true, tradeName: true } } } },
          },
        },
        responsible: { select: { id: true, name: true } },
      },
    }),
    prisma.agendaEvent.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        eventDate: { gte: range.start, lt: range.end },
        ...(responsible ? { responsibleUserId: responsible } : {}),
      },
      include: {
        process: { select: { id: true, cnjFormatted: true } },
        responsible: { select: { id: true, name: true } },
      },
    }),
  ]);

  const items = [
    ...workItems.map((item) => ({
      id: `work:${item.id}`,
      sourceId: item.id,
      source: "WORK_ITEM" as const,
      type: item.kind,
      title: item.title,
      date: item.dueDate!,
      time: item.dueTime,
      responsible: item.responsible,
      process: item.process,
      isFatal: item.isFatal,
      priority: item.priority,
      notes: item.notes,
    })),
    ...events.map((event) => ({
      id: `agenda:${event.id}`,
      sourceId: event.id,
      source: "AGENDA_EVENT" as const,
      type: event.type,
      title: event.title,
      date: event.eventDate,
      time: event.startTime,
      responsible: event.responsible,
      process: event.process,
      isFatal: false,
      priority: "NORMAL",
      notes: event.notes,
    })),
  ].sort((a, b) => {
    const dateCompare = a.date.getTime() - b.date.getTime();
    if (dateCompare !== 0) return dateCompare;
    return (a.time ?? "99:99").localeCompare(b.time ?? "99:99");
  });

  return { items, range };
}

export async function createAgendaEvent(input: {
  organizationId: string;
  actorUserId: string;
  data: AgendaEventInput;
}) {
  if (input.data.processId) {
    const process = await prisma.process.findFirst({ where: { id: input.data.processId, organizationId: input.organizationId }, select: { id: true } });
    if (!process) throw new Error("PROCESS_NOT_FOUND");
  }
  if (input.data.responsibleUserId) {
    const member = await prisma.member.findFirst({ where: { organizationId: input.organizationId, userId: input.data.responsibleUserId }, select: { id: true } });
    if (!member) throw new Error("PROCESS_RESPONSIBLE_INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const event = await tx.agendaEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.data.processId || null,
        type: input.data.type,
        title: input.data.title,
        eventDate: toDate(input.data.eventDate),
        startTime: optional(input.data.startTime),
        endTime: optional(input.data.endTime),
        responsibleUserId: input.data.responsibleUserId || null,
        notes: optional(input.data.notes),
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });
    if (input.data.processId) {
      await tx.processTimelineEvent.create({
        data: {
          organizationId: input.organizationId,
          processId: input.data.processId,
          kind: input.data.type === "HEARING" ? "HEARING_CREATED" : "COMMITMENT_CREATED",
          title: input.data.type === "HEARING" ? "Audiência adicionada à Agenda" : "Compromisso adicionado à Agenda",
          description: input.data.title,
          source: "SYSTEM",
          createdByUserId: input.actorUserId,
        },
      });
    }
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "agenda",
        action: input.data.type === "HEARING" ? "agenda.hearing.created" : "agenda.commitment.created",
        entityType: "agenda_event",
        entityId: event.id,
        metadata: { processId: input.data.processId || null, date: input.data.eventDate },
      },
    });
    return event;
  });
}

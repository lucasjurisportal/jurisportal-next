import { prisma } from "@/infrastructure/database/prisma";
import { buildGoogleEvent } from "../domain/google-event";
import { saoPauloTodayString } from "@/modules/work-items/domain/work-item-date";
import { deleteGoogleEvent, insertGoogleEvent, patchGoogleEvent } from "../infrastructure/google-calendar-client";

const PROVIDER = "GOOGLE";
const MAX_BACKFILL_ITEMS = 100;

function dateString(date: Date) { return date.toISOString().slice(0, 10); }
function safeError(error: unknown) { return (error instanceof Error ? error.message : "UNKNOWN_GOOGLE_CALENDAR_ERROR").slice(0, 500); }

async function connectedUser(organizationId: string, userId?: string | null) {
  if (!userId) return null;
  return prisma.googleCalendarConnection.findFirst({
    where: { organizationId, userId, status: "CONNECTED", encryptedRefreshToken: { not: null } },
  });
}

async function removeExistingLink(link: { id: string; userId: string; externalCalendarId: string; externalEventId: string | null }, organizationId: string) {
  if (!link.externalEventId) {
    await prisma.externalCalendarEventLink.delete({ where: { id: link.id } }).catch(() => undefined);
    return true;
  }
  const oldConnection = await connectedUser(organizationId, link.userId);
  if (!oldConnection) {
    await prisma.externalCalendarEventLink.update({
      where: { id: link.id },
      data: { syncStatus: "ERROR", lastError: "Conexão Google indisponível para remover o evento externo." },
    });
    return false;
  }
  try {
    await deleteGoogleEvent(oldConnection.id, link.externalCalendarId, link.externalEventId);
    await prisma.externalCalendarEventLink.delete({ where: { id: link.id } });
    return true;
  } catch (error) {
    await prisma.externalCalendarEventLink.update({
      where: { id: link.id },
      data: { syncStatus: "ERROR", lastError: safeError(error) },
    });
    return false;
  }
}

async function persistSyncError(input: { organizationId: string; userId: string; sourceType: "WORK_ITEM" | "AGENDA_EVENT"; sourceId: string; existingEventId?: string | null; error: unknown }) {
  await prisma.externalCalendarEventLink.upsert({
    where: {
      provider_organizationId_sourceType_sourceId: {
        provider: PROVIDER, organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.sourceId,
      },
    },
    create: {
      organizationId: input.organizationId, userId: input.userId, provider: PROVIDER,
      sourceType: input.sourceType, sourceId: input.sourceId, externalCalendarId: "primary",
      externalEventId: input.existingEventId ?? null, syncStatus: "ERROR", lastError: safeError(input.error),
    },
    update: { userId: input.userId, syncStatus: "ERROR", lastError: safeError(input.error) },
  });
}

async function upsertExternalEvent(input: {
  organizationId: string;
  userId: string;
  sourceType: "WORK_ITEM" | "AGENDA_EVENT";
  sourceId: string;
  payload: ReturnType<typeof buildGoogleEvent>;
}) {
  const connection = await connectedUser(input.organizationId, input.userId);
  if (!connection) return { status: "NO_CONNECTION" as const };

  let link = await prisma.externalCalendarEventLink.findUnique({
    where: {
      provider_organizationId_sourceType_sourceId: {
        provider: PROVIDER,
        organizationId: input.organizationId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      },
    },
  });

  if (link && link.userId !== input.userId) {
    const removed = await removeExistingLink(link, input.organizationId);
    if (!removed) throw new Error("GOOGLE_CALENDAR_OLD_EVENT_DELETE_PENDING");
    link = null;
  }

  try {
    let externalEventId = link?.externalEventId;
    if (externalEventId) {
      try {
        await patchGoogleEvent(connection.id, connection.calendarId, externalEventId, input.payload);
      } catch (error) {
        if (!(error instanceof Error) || !error.message.includes("GOOGLE_CALENDAR_API_FAILED:404:")) throw error;
        externalEventId = await insertGoogleEvent(connection.id, connection.calendarId, input.payload);
      }
    } else {
      externalEventId = await insertGoogleEvent(connection.id, connection.calendarId, input.payload);
    }

    await prisma.externalCalendarEventLink.upsert({
      where: {
        provider_organizationId_sourceType_sourceId: {
          provider: PROVIDER,
          organizationId: input.organizationId,
          sourceType: input.sourceType,
          sourceId: input.sourceId,
        },
      },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        provider: PROVIDER,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        externalCalendarId: connection.calendarId,
        externalEventId,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
      },
      update: {
        userId: input.userId,
        externalCalendarId: connection.calendarId,
        externalEventId,
        syncStatus: "SYNCED",
        lastSyncedAt: new Date(),
        lastError: null,
      },
    });
    return { status: "SYNCED" as const, externalEventId };
  } catch (error) {
    await persistSyncError({ organizationId: input.organizationId, userId: input.userId, sourceType: input.sourceType, sourceId: input.sourceId, existingEventId: link?.externalEventId, error });
    throw error;
  }
}

export async function syncWorkItemToGoogleCalendar(input: { organizationId: string; workItemId: string }) {
  const item = await prisma.processWorkItem.findFirst({
    where: { id: input.workItemId, organizationId: input.organizationId },
    include: {
      process: { select: { cnjFormatted: true, subject: true } },
    },
  });
  if (!item) return { status: "NOT_FOUND" as const };

  const link = await prisma.externalCalendarEventLink.findUnique({
    where: {
      provider_organizationId_sourceType_sourceId: {
        provider: PROVIDER,
        organizationId: input.organizationId,
        sourceType: "WORK_ITEM",
        sourceId: item.id,
      },
    },
  });

  if (item.status !== "OPEN" || !item.dueDate) {
    if (link) {
      const removed = await removeExistingLink(link, input.organizationId);
      if (!removed) return { status: "DELETE_PENDING" as const };
    }
    return { status: "REMOVED" as const };
  }

  const targetUserId = item.responsibleUserId ?? item.createdByUserId;
  if (!targetUserId) return { status: "NO_TARGET_USER" as const };
  const prefix = item.kind === "DEADLINE" ? (item.isFatal ? "[Prazo fatal]" : "[Prazo]") : "[Tarefa]";
  const details = [
    `Processo: ${item.process.cnjFormatted}`,
    item.process.subject ? `Assunto: ${item.process.subject}` : null,
    item.notes ? `Observações: ${item.notes}` : null,
    "Origem: Jurisportal Next",
  ].filter(Boolean).join("\n");

  return upsertExternalEvent({
    organizationId: input.organizationId,
    userId: targetUserId,
    sourceType: "WORK_ITEM",
    sourceId: item.id,
    payload: buildGoogleEvent({
      sourceType: "WORK_ITEM",
      sourceId: item.id,
      organizationId: input.organizationId,
      title: `${prefix} ${item.title}`,
      description: details,
      date: dateString(item.dueDate),
      startTime: item.dueTime,
      defaultDurationMinutes: 30,
    }),
  });
}

export async function syncAgendaEventToGoogleCalendar(input: { organizationId: string; agendaEventId: string }) {
  const event = await prisma.agendaEvent.findFirst({
    where: { id: input.agendaEventId, organizationId: input.organizationId },
    include: { process: { select: { cnjFormatted: true } } },
  });
  if (!event) return { status: "NOT_FOUND" as const };

  const link = await prisma.externalCalendarEventLink.findUnique({
    where: {
      provider_organizationId_sourceType_sourceId: {
        provider: PROVIDER,
        organizationId: input.organizationId,
        sourceType: "AGENDA_EVENT",
        sourceId: event.id,
      },
    },
  });
  if (event.status !== "OPEN") {
    if (link) {
      const removed = await removeExistingLink(link, input.organizationId);
      if (!removed) return { status: "DELETE_PENDING" as const };
    }
    return { status: "REMOVED" as const };
  }

  const targetUserId = event.responsibleUserId ?? event.createdByUserId;
  if (!targetUserId) return { status: "NO_TARGET_USER" as const };
  const prefix = event.type === "HEARING" ? "[Audiência]" : "[Compromisso]";
  const details = [
    event.process ? `Processo: ${event.process.cnjFormatted}` : null,
    event.notes ? `Detalhes: ${event.notes}` : null,
    "Origem: Jurisportal Next",
  ].filter(Boolean).join("\n");

  return upsertExternalEvent({
    organizationId: input.organizationId,
    userId: targetUserId,
    sourceType: "AGENDA_EVENT",
    sourceId: event.id,
    payload: buildGoogleEvent({
      sourceType: "AGENDA_EVENT",
      sourceId: event.id,
      organizationId: input.organizationId,
      title: `${prefix} ${event.title}`,
      description: details,
      date: dateString(event.eventDate),
      startTime: event.startTime,
      endTime: event.endTime,
      defaultDurationMinutes: 60,
    }),
  });
}

export async function syncUpcomingForUser(input: { organizationId: string; userId: string }) {
  const connection = await connectedUser(input.organizationId, input.userId);
  if (!connection) throw new Error("GOOGLE_CALENDAR_NOT_CONNECTED");
  const today = new Date(`${saoPauloTodayString()}T00:00:00.000Z`);
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + 90);

  const [workItems, agendaEvents] = await Promise.all([
    prisma.processWorkItem.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        dueDate: { gte: today, lt: end },
        OR: [
          { responsibleUserId: input.userId },
          { responsibleUserId: null, createdByUserId: input.userId },
        ],
      },
      select: { id: true },
      orderBy: { dueDate: "asc" },
      take: MAX_BACKFILL_ITEMS,
    }),
    prisma.agendaEvent.findMany({
      where: {
        organizationId: input.organizationId,
        status: "OPEN",
        eventDate: { gte: today, lt: end },
        OR: [
          { responsibleUserId: input.userId },
          { responsibleUserId: null, createdByUserId: input.userId },
        ],
      },
      select: { id: true },
      orderBy: { eventDate: "asc" },
      take: MAX_BACKFILL_ITEMS,
    }),
  ]);

  const jobs = [
    ...workItems.map((item) => () => syncWorkItemToGoogleCalendar({ organizationId: input.organizationId, workItemId: item.id })),
    ...agendaEvents.map((event) => () => syncAgendaEventToGoogleCalendar({ organizationId: input.organizationId, agendaEventId: event.id })),
  ];
  let synced = 0;
  let failed = 0;
  const concurrency = 5;
  for (let index = 0; index < jobs.length; index += concurrency) {
    const results = await Promise.allSettled(jobs.slice(index, index + concurrency).map((job) => job()));
    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value.status === "SYNCED") synced += 1;
      } else {
        failed += 1;
      }
    }
  }
  return { synced, failed, scanned: jobs.length };
}

export async function removeGoogleCalendarLinksForSources(input: {
  organizationId: string;
  sources: { sourceType: "WORK_ITEM" | "AGENDA_EVENT"; sourceId: string }[];
}) {
  for (const source of input.sources) {
    const link = await prisma.externalCalendarEventLink.findUnique({
      where: {
        provider_organizationId_sourceType_sourceId: {
          provider: PROVIDER,
          organizationId: input.organizationId,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
        },
      },
    });
    if (!link) continue;
    await removeExistingLink(link, input.organizationId);
  }
}

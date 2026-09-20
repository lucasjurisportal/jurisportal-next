import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { createProcessWorkItem, changeProcessWorkItemStatus } from "@/modules/processes/application/process-workspace-service";
import type { GlobalWorkItemCreateInput, TaskEditInput } from "../domain/work-item.schema";
import { saoPauloTodayString } from "../domain/work-item-date";

const PAGE_SIZE = 20;

function dateOnly(value?: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

function optional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

export async function getWorkItemFormOptions(organizationId: string) {
  const [processes, members] = await Promise.all([
    prisma.process.findMany({
      where: { organizationId, status: { in: ["ACTIVE", "FOUND"] } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        cnjFormatted: true,
        subject: true,
        clients: {
          where: { isPrimary: true },
          take: 1,
          select: { client: { select: { name: true, tradeName: true } } },
        },
      },
    }),
    prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);
  return { processes, members };
}

export async function listGlobalWorkItems(input: {
  organizationId: string;
  currentUserId: string;
  view?: string;
  query?: string;
  responsibleUserId?: string;
  kind?: "DEADLINE" | "TASK";
  page?: number;
}) {
  const todayString = saoPauloTodayString();
  const today = dateOnly(todayString)!;
  const tomorrow = addDays(todayString, 1);
  const page = Math.max(1, input.page ?? 1);
  const view = input.view || "all";
  const q = input.query?.trim();

  const where: Prisma.ProcessWorkItemWhereInput = {
    organizationId: input.organizationId,
    ...(input.kind ? { kind: input.kind } : {}),
    ...(input.responsibleUserId ? { responsibleUserId: input.responsibleUserId } : {}),
  };

  if (view === "completed") where.status = "DONE";
  else where.status = "OPEN";
  if (view === "overdue") where.dueDate = { lt: today };
  if (view === "today") where.dueDate = { gte: today, lt: tomorrow };
  if (view === "upcoming") where.dueDate = { gte: tomorrow };
  if (view === "fatal") Object.assign(where, { kind: "DEADLINE", isFatal: true });
  if (view === "mine") where.responsibleUserId = input.currentUserId;
  if (view === "delegated") {
    where.createdByUserId = input.currentUserId;
    where.NOT = { responsibleUserId: input.currentUserId };
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { process: { cnjFormatted: { contains: q, mode: "insensitive" } } },
      { process: { subject: { contains: q, mode: "insensitive" } } },
      { process: { clients: { some: { client: { name: { contains: q, mode: "insensitive" } } } } } },
      { process: { clients: { some: { client: { tradeName: { contains: q, mode: "insensitive" } } } } } },
    ];
  }

  const include = {
    process: {
      select: {
        id: true,
        cnjFormatted: true,
        subject: true,
        clients: {
          where: { isPrimary: true },
          take: 1,
          select: { client: { select: { name: true, tradeName: true } } },
        },
      },
    },
    responsible: { select: { id: true, name: true, email: true } },
    createdBy: { select: { id: true, name: true } },
  } satisfies Prisma.ProcessWorkItemInclude;

  const [total, items] = await prisma.$transaction([
    prisma.processWorkItem.count({ where }),
    prisma.processWorkItem.findMany({
      where,
      include,
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return { items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)), todayString };
}

export async function getWorkItemSummary(organizationId: string) {
  const todayString = saoPauloTodayString();
  const today = dateOnly(todayString)!;
  const tomorrow = addDays(todayString, 1);
  const [open, overdue, todayCount, fatal] = await Promise.all([
    prisma.processWorkItem.count({ where: { organizationId, status: "OPEN" } }),
    prisma.processWorkItem.count({ where: { organizationId, status: "OPEN", dueDate: { lt: today } } }),
    prisma.processWorkItem.count({ where: { organizationId, status: "OPEN", dueDate: { gte: today, lt: tomorrow } } }),
    prisma.processWorkItem.count({ where: { organizationId, status: "OPEN", kind: "DEADLINE", isFatal: true } }),
  ]);
  return { open, overdue, today: todayCount, fatal };
}

export async function createGlobalWorkItem(input: {
  organizationId: string;
  actorUserId: string;
  data: GlobalWorkItemCreateInput;
}) {
  const { processId, ...data } = input.data;
  return createProcessWorkItem({
    organizationId: input.organizationId,
    processId,
    actorUserId: input.actorUserId,
    data,
  });
}

export async function changeGlobalWorkItemStatus(input: {
  organizationId: string;
  actorUserId: string;
  workItemId: string;
  status: "OPEN" | "DONE";
}) {
  const item = await prisma.processWorkItem.findFirst({
    where: { id: input.workItemId, organizationId: input.organizationId },
    select: { id: true, processId: true },
  });
  if (!item) throw new Error("WORK_ITEM_NOT_FOUND");
  return changeProcessWorkItemStatus({
    organizationId: input.organizationId,
    processId: item.processId,
    workItemId: item.id,
    actorUserId: input.actorUserId,
    status: input.status,
  });
}

export async function updateTask(input: {
  organizationId: string;
  actorUserId: string;
  workItemId: string;
  data: TaskEditInput;
}) {
  const current = await prisma.processWorkItem.findFirst({
    where: { id: input.workItemId, organizationId: input.organizationId },
  });
  if (!current) throw new Error("WORK_ITEM_NOT_FOUND");
  if (current.kind !== "TASK") throw new Error("DEADLINE_EDIT_REQUIRES_AUDITED_FLOW");

  if (input.data.responsibleUserId) {
    const member = await prisma.member.findFirst({
      where: { organizationId: input.organizationId, userId: input.data.responsibleUserId },
      select: { id: true },
    });
    if (!member) throw new Error("PROCESS_RESPONSIBLE_INVALID");
  }

  return prisma.$transaction(async (tx) => {
    const item = await tx.processWorkItem.update({
      where: { id: current.id },
      data: {
        title: input.data.title,
        dueDate: dateOnly(input.data.dueDate),
        dueTime: optional(input.data.dueTime),
        responsibleUserId: input.data.responsibleUserId || null,
        priority: input.data.priority,
        notes: optional(input.data.notes),
        updatedByUserId: input.actorUserId,
      },
    });
    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: current.processId,
        kind: "TASK_UPDATED",
        title: "Tarefa atualizada",
        description: input.data.title,
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "work_items",
        action: "task.updated",
        entityType: "process_work_item",
        entityId: current.id,
        metadata: { processId: current.processId },
      },
    });
    return item;
  });
}

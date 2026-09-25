import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { calculateContractedFee } from "../domain/fee-calculation";
import { scopedRecordWhere } from "@/modules/security/domain/tenant-process-scope";
import type {
  FeeAgreementInput,
  FinanceEntryInput,
  ManualTimelineEventInput,
  ProcessWorkItemInput,
} from "../domain/process-workspace.schema";

function optional(value?: string | null) {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function dateOnly(value?: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

async function assertProcess(organizationId: string, processId: string) {
  const process = await prisma.process.findFirst({
    where: { id: processId, organizationId },
    select: { id: true },
  });
  if (!process) throw new Error("PROCESS_NOT_FOUND");
}

async function assertMember(organizationId: string, userId?: string | null) {
  if (!userId) return;
  const member = await prisma.member.findFirst({
    where: { organizationId, userId },
    select: { id: true },
  });
  if (!member) throw new Error("PROCESS_RESPONSIBLE_INVALID");
}

export async function getProcessWorkspaceData(organizationId: string, processId: string) {
  const [workItems, feeAgreement, financeEntries, auditEvents, members] = await Promise.all([
    prisma.processWorkItem.findMany({
      where: { organizationId, processId },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { responsible: { select: { id: true, name: true, email: true } } },
    }),
    prisma.processFeeAgreement.findFirst({ where: { organizationId, processId } }),
    prisma.processFinanceEntry.findMany({
      where: { organizationId, processId },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    prisma.auditEvent.findMany({
      where: { organizationId, entityType: "process", entityId: processId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { id: true, name: true, email: true } } },
    }),
    prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const money = (value: Prisma.Decimal | null | undefined) => Number(value?.toString() ?? "0");
  const contracted = money(feeAgreement?.contractedAmount);
  const received = financeEntries
    .filter((entry) => entry.kind === "FEE_RECEIPT" && entry.status === "PAID")
    .reduce((sum, entry) => sum + money(entry.amount), 0);
  const costs = financeEntries
    .filter((entry) => entry.kind === "COST")
    .reduce((sum, entry) => sum + money(entry.amount), 0);

  return {
    workItems,
    feeAgreement,
    financeEntries,
    auditEvents,
    members,
    financeSummary: {
      contracted,
      received,
      receivable: Math.max(contracted - received, 0),
      costs,
    },
  };
}

export async function addManualTimelineEvent(input: {
  organizationId: string;
  processId: string;
  actorUserId: string;
  data: ManualTimelineEventInput;
}) {
  await assertProcess(input.organizationId, input.processId);
  return prisma.$transaction(async (tx) => {
    const event = await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: "MANUAL_NOTE",
        title: input.data.title,
        description: optional(input.data.description),
        source: "MANUAL",
        createdByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: "process.timeline.manual_event_created",
        entityType: "process",
        entityId: input.processId,
        metadata: { timelineEventId: event.id },
      },
    });
    return event;
  });
}

export async function createProcessWorkItem(input: {
  organizationId: string;
  processId: string;
  actorUserId: string;
  data: ProcessWorkItemInput;
}) {
  await assertProcess(input.organizationId, input.processId);
  await assertMember(input.organizationId, input.data.responsibleUserId);

  return prisma.$transaction(async (tx) => {
    const item = await tx.processWorkItem.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: input.data.kind,
        title: input.data.title,
        dueDate: dateOnly(input.data.dueDate),
        dueTime: optional(input.data.dueTime),
        responsibleUserId: input.data.responsibleUserId || null,
        priority: input.data.priority,
        isFatal: input.data.kind === "DEADLINE" ? input.data.isFatal : false,
        status: "OPEN",
        origin: "MANUAL",
        notes: optional(input.data.notes),
        createdByUserId: input.actorUserId,
        updatedByUserId: input.actorUserId,
      },
    });

    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: input.data.kind === "DEADLINE" ? "DEADLINE_CREATED" : "TASK_CREATED",
        title: input.data.kind === "DEADLINE" ? "Prazo criado" : "Tarefa criada",
        description: input.data.title,
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });

    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: input.data.kind === "DEADLINE" ? "process.deadline.created" : "process.task.created",
        entityType: "process",
        entityId: input.processId,
        metadata: { workItemId: item.id, dueDate: input.data.dueDate || null },
      },
    });
    return item;
  });
}

export async function changeProcessWorkItemStatus(input: {
  organizationId: string;
  processId: string;
  workItemId: string;
  actorUserId: string;
  status: "OPEN" | "DONE";
}) {
  const current = await prisma.processWorkItem.findFirst({
    where: { id: input.workItemId, processId: input.processId, organizationId: input.organizationId },
  });
  if (!current) throw new Error("WORK_ITEM_NOT_FOUND");

  return prisma.$transaction(async (tx) => {
    const item = await tx.processWorkItem.update({
      where: { ...scopedRecordWhere(current.id, input.organizationId), processId: input.processId },
      data: {
        status: input.status,
        completedAt: input.status === "DONE" ? new Date() : null,
        updatedByUserId: input.actorUserId,
      },
    });
    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: input.status === "DONE" ? "WORK_ITEM_COMPLETED" : "WORK_ITEM_REOPENED",
        title: input.status === "DONE" ? "Item operacional concluído" : "Item operacional reaberto",
        description: current.title,
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "processes",
        action: input.status === "DONE" ? "process.work_item.completed" : "process.work_item.reopened",
        entityType: "process",
        entityId: input.processId,
        metadata: { workItemId: current.id, kind: current.kind },
      },
    });
    return item;
  });
}

export async function upsertProcessFeeAgreement(input: {
  organizationId: string;
  processId: string;
  actorUserId: string;
  data: FeeAgreementInput;
}) {
  const process = await prisma.process.findFirst({
    where: { id: input.processId, organizationId: input.organizationId },
    select: { id: true, caseValue: true },
  });
  if (!process) throw new Error("PROCESS_NOT_FOUND");

  const caseValue = Number(process.caseValue?.toString() ?? "0");
  const fixedAmount = Number(input.data.fixedAmount ?? 0);
  const percentage = Number(input.data.successPercentage ?? 0);
  const contractedAmount = calculateContractedFee({
    model: input.data.model,
    caseValue,
    fixedAmount,
    percentage,
    manualAmount: Number(input.data.contractedAmount ?? 0),
  });

  const common = {
    organizationId: input.organizationId,
    model: input.data.model,
    fixedAmount: input.data.model === "PERCENTAGE" || input.data.model === "MANUAL" ? null : fixedAmount,
    contractedAmount,
    successPercentage: input.data.model === "FIXED" || input.data.model === "MANUAL" ? null : percentage,
    percentageBase: input.data.percentageBase,
    successBase: input.data.model === "PERCENTAGE" || input.data.model === "FIXED_PLUS_PERCENTAGE" ? "Valor da causa" : optional(input.data.successBase),
    notes: optional(input.data.notes),
    updatedByUserId: input.actorUserId,
  };

  return prisma.$transaction(async (tx) => {
    const agreement = await tx.processFeeAgreement.upsert({
      where: { processId: input.processId },
      create: {
        ...common,
        processId: input.processId,
        createdByUserId: input.actorUserId,
      },
      update: common,
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "finance",
        action: "process.fee_agreement.updated",
        entityType: "process",
        entityId: input.processId,
        metadata: { model: input.data.model, contractedAmount, calculationBase: input.data.percentageBase },
      },
    });
    return agreement;
  });
}

export async function createProcessFinanceEntry(input: {
  organizationId: string;
  processId: string;
  actorUserId: string;
  data: FinanceEntryInput;
}) {
  await assertProcess(input.organizationId, input.processId);
  return prisma.$transaction(async (tx) => {
    const entry = await tx.processFinanceEntry.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: input.data.kind,
        description: input.data.description,
        amount: input.data.amount,
        entryDate: dateOnly(input.data.entryDate)!,
        status: input.data.status,
        paidBy: optional(input.data.paidBy),
        reimbursable: input.data.reimbursable,
        notes: optional(input.data.notes),
        createdByUserId: input.actorUserId,
      },
    });
    await tx.processTimelineEvent.create({
      data: {
        organizationId: input.organizationId,
        processId: input.processId,
        kind: "FINANCE_ENTRY_CREATED",
        title: "Lançamento financeiro criado",
        description: input.data.description,
        source: "SYSTEM",
        createdByUserId: input.actorUserId,
      },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "finance",
        action: "process.finance_entry.created",
        entityType: "process",
        entityId: input.processId,
        metadata: { financeEntryId: entry.id, kind: input.data.kind },
      },
    });
    return entry;
  });
}

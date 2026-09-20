import { prisma } from "@/infrastructure/database/prisma";
import type { ReportPeriod } from "../domain/report-period";

const personSelect = { id: true, name: true, email: true } as const;
const SESSION_ACTIONS = ["team.session.started", "team.session.ended"] as const;

function money(value: unknown) {
  if (value == null) return 0;
  return Number(value);
}

function metadataReason(value: unknown): string | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const reason = (value as Record<string, unknown>).reason;
  return typeof reason === "string" ? reason : null;
}

function sessionReasonLabel(reason: string | null) {
  if (reason === "manual") return "Logout manual";
  if (reason === "inactivity") return "Logout por inatividade";
  if (reason === "removed_by_owner") return "Acesso removido pelo proprietário";
  return reason ? "Sessão encerrada" : "Sem logout registrado";
}

function minutesBetween(from: Date, to: Date | null) {
  if (!to || to.getTime() < from.getTime()) return null;
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

export async function getReportUserOptions(organizationId: string) {
  const [members, historicalProfiles] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        role: true,
        user: { select: personSelect },
      },
    }),
    prisma.teamMemberProfile.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
      select: {
        status: true,
        accessLevel: true,
        user: { select: personSelect },
      },
    }),
  ]);

  const users = new Map<string, { id: string; name: string; email: string; label: string }>();
  for (const member of members) {
    users.set(member.user.id, {
      ...member.user,
      label: member.role === "owner" ? "Proprietário" : "Equipe",
    });
  }
  for (const profile of historicalProfiles) {
    if (!users.has(profile.user.id)) {
      users.set(profile.user.id, {
        ...profile.user,
        label: profile.status === "REMOVED" ? "Removido" : profile.accessLevel,
      });
    }
  }

  return Array.from(users.values());
}

export async function getReportData(input: {
  organizationId: string;
  period: ReportPeriod;
  includeAdvanced: boolean;
  includeTeamActivity: boolean;
  userId?: string | null;
}) {
  const dateRange = { gte: input.period.fromDate, lt: input.period.toDateExclusive };
  const timestampRange = { gte: input.period.fromTimestamp, lt: input.period.toTimestampExclusive };
  const userId = input.userId || undefined;
  const now = new Date();
  const todayUtc = new Date(new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now) + "T00:00:00.000Z");

  const clientUserWhere = userId ? { createdByUserId: userId } : {};
  const processUserWhere = userId ? { responsibleUserId: userId } : {};
  const workUserWhere = userId ? { responsibleUserId: userId } : {};
  const publicationUserWhere = userId ? { OR: [{ readByUserId: userId }, { treatedByUserId: userId }] } : {};
  const financeUserWhere = userId ? { createdByUserId: userId } : {};

  const [
    totalClients,
    newClients,
    totalProcesses,
    activeProcesses,
    newProcesses,
    openWorkItems,
    overdueWorkItems,
    dueWorkItems,
    completedWorkItems,
    capturedPublications,
    untreatedPublications,
    pendingDeadlineReviews,
    receivedFees,
    paidCosts,
    pendingFees,
    processes,
    workItems,
    publications,
    financeEntries,
  ] = await Promise.all([
    prisma.client.count({ where: { organizationId: input.organizationId, status: "ACTIVE", ...clientUserWhere } }),
    prisma.client.count({ where: { organizationId: input.organizationId, createdAt: timestampRange, ...clientUserWhere } }),
    prisma.process.count({ where: { organizationId: input.organizationId, ...processUserWhere } }),
    prisma.process.count({ where: { organizationId: input.organizationId, status: "ACTIVE", ...processUserWhere } }),
    prisma.process.count({ where: { organizationId: input.organizationId, createdAt: timestampRange, ...processUserWhere } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, status: "OPEN", ...workUserWhere } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, status: "OPEN", dueDate: { lt: todayUtc }, ...workUserWhere } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, dueDate: dateRange, ...workUserWhere } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, status: "DONE", completedAt: timestampRange, ...workUserWhere } }),
    prisma.publication.count({ where: { organizationId: input.organizationId, publicationDate: dateRange, ...publicationUserWhere } }),
    prisma.publication.count({ where: { organizationId: input.organizationId, publicationDate: dateRange, treatedAt: null, ...publicationUserWhere } }),
    userId
      ? prisma.deadlineReview.count({
          where: {
            organizationId: input.organizationId,
            status: "PENDING_REVIEW",
            publication: { OR: [{ readByUserId: userId }, { treatedByUserId: userId }] },
          },
        })
      : prisma.deadlineReview.count({ where: { organizationId: input.organizationId, status: "PENDING_REVIEW" } }),
    prisma.processFinanceEntry.aggregate({ where: { organizationId: input.organizationId, kind: "FEE_RECEIPT", status: "PAID", entryDate: dateRange, ...financeUserWhere }, _sum: { amount: true } }),
    prisma.processFinanceEntry.aggregate({ where: { organizationId: input.organizationId, kind: "COST", status: "PAID", entryDate: dateRange, ...financeUserWhere }, _sum: { amount: true } }),
    prisma.processFinanceEntry.aggregate({ where: { organizationId: input.organizationId, kind: "FEE_RECEIPT", status: "PENDING", entryDate: dateRange, ...financeUserWhere }, _sum: { amount: true } }),
    prisma.process.findMany({
      where: { organizationId: input.organizationId, createdAt: timestampRange, ...processUserWhere },
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true, internalCode: true, cnjFormatted: true, status: true, subject: true, court: true, district: true,
        caseValue: true, createdAt: true, responsible: { select: personSelect },
        clients: { where: { isPrimary: true }, take: 1, select: { client: { select: { name: true, tradeName: true } } } },
      },
    }),
    prisma.processWorkItem.findMany({
      where: { organizationId: input.organizationId, dueDate: dateRange, ...workUserWhere },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 80,
      select: {
        id: true, kind: true, title: true, dueDate: true, dueTime: true, priority: true, isFatal: true, status: true, completedAt: true,
        responsible: { select: personSelect },
        process: { select: { id: true, internalCode: true, cnjFormatted: true } },
      },
    }),
    prisma.publication.findMany({
      where: { organizationId: input.organizationId, publicationDate: dateRange, ...publicationUserWhere },
      orderBy: [{ publicationDate: "desc" }, { createdAt: "desc" }],
      take: 80,
      select: {
        id: true, kind: true, communicationType: true, court: true, judicialBody: true, processNumberFormatted: true,
        publicationDate: true, sourceStatus: true, readAt: true, treatedAt: true,
        process: { select: { id: true, internalCode: true } },
      },
    }),
    prisma.processFinanceEntry.findMany({
      where: { organizationId: input.organizationId, entryDate: dateRange, ...financeUserWhere },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      take: 80,
      select: {
        id: true, kind: true, description: true, amount: true, entryDate: true, status: true, paidBy: true, reimbursable: true,
        process: { select: { id: true, internalCode: true, cnjFormatted: true } },
      },
    }),
  ]);

  const advanced = input.includeAdvanced
    ? await getAdvancedBreakdown(input.organizationId, timestampRange, dateRange, userId)
    : null;
  const team = input.includeTeamActivity
    ? await getTeamActivity(input.organizationId, timestampRange, userId)
    : null;

  return {
    summary: {
      totalClients,
      newClients,
      totalProcesses,
      activeProcesses,
      newProcesses,
      openWorkItems,
      overdueWorkItems,
      dueWorkItems,
      completedWorkItems,
      capturedPublications,
      untreatedPublications,
      pendingDeadlineReviews,
      receivedFees: money(receivedFees._sum.amount),
      paidCosts: money(paidCosts._sum.amount),
      pendingFees: money(pendingFees._sum.amount),
    },
    processes: processes.map((item) => ({ ...item, caseValue: money(item.caseValue) })),
    workItems,
    publications,
    financeEntries: financeEntries.map((item) => ({ ...item, amount: money(item.amount) })),
    advanced,
    team,
  };
}

async function getAdvancedBreakdown(
  organizationId: string,
  timestampRange: { gte: Date; lt: Date },
  dateRange: { gte: Date; lt: Date },
  userId?: string,
) {
  const processUserWhere = userId ? { responsibleUserId: userId } : {};
  const workUserWhere = userId ? { responsibleUserId: userId } : {};

  const [processByStatus, workByKind, processByResponsible, workByResponsible] = await Promise.all([
    prisma.process.groupBy({ by: ["status"], where: { organizationId, createdAt: timestampRange, ...processUserWhere }, _count: { _all: true } }),
    prisma.processWorkItem.groupBy({ by: ["kind"], where: { organizationId, dueDate: dateRange, ...workUserWhere }, _count: { _all: true } }),
    prisma.process.groupBy({ by: ["responsibleUserId"], where: { organizationId, createdAt: timestampRange, ...processUserWhere }, _count: { _all: true } }),
    prisma.processWorkItem.groupBy({ by: ["responsibleUserId"], where: { organizationId, dueDate: dateRange, ...workUserWhere }, _count: { _all: true } }),
  ]);

  const userIds = Array.from(new Set([
    ...processByResponsible.map((item) => item.responsibleUserId),
    ...workByResponsible.map((item) => item.responsibleUserId),
  ].filter((value): value is string => Boolean(value))));
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: personSelect }) : [];
  const names = new Map(users.map((user) => [user.id, user.name]));

  const mergeResponsible = new Map<string, { userId: string | null; name: string; processes: number; workItems: number }>();
  for (const item of processByResponsible) {
    const key = item.responsibleUserId ?? "unassigned";
    mergeResponsible.set(key, { userId: item.responsibleUserId, name: item.responsibleUserId ? names.get(item.responsibleUserId) ?? "Usuário" : "Sem responsável", processes: item._count._all, workItems: 0 });
  }
  for (const item of workByResponsible) {
    const key = item.responsibleUserId ?? "unassigned";
    const current = mergeResponsible.get(key) ?? { userId: item.responsibleUserId, name: item.responsibleUserId ? names.get(item.responsibleUserId) ?? "Usuário" : "Sem responsável", processes: 0, workItems: 0 };
    current.workItems = item._count._all;
    mergeResponsible.set(key, current);
  }

  return {
    processByStatus: processByStatus.map((item) => ({ status: item.status, count: item._count._all })),
    workByKind: workByKind.map((item) => ({ kind: item.kind, count: item._count._all })),
    byResponsible: Array.from(mergeResponsible.values()).sort((a, b) => (b.processes + b.workItems) - (a.processes + a.workItems)),
  };
}

async function getTeamActivity(
  organizationId: string,
  timestampRange: { gte: Date; lt: Date },
  userId?: string,
) {
  const profiles = await prisma.teamMemberProfile.findMany({
    where: { organizationId, ...(userId ? { userId } : {}) },
    select: { userId: true, lastActiveAt: true, status: true, user: { select: personSelect } },
  });
  const staffIds = profiles.map((profile) => profile.userId);
  if (staffIds.length === 0) return { members: [], sessions: [], recent: [] };

  const actorFilter = userId ? userId : { in: staffIds };
  const [counts, recent, sessionEvents] = await Promise.all([
    prisma.auditEvent.groupBy({
      by: ["actorUserId"],
      where: {
        organizationId,
        actorUserId: actorFilter,
        createdAt: timestampRange,
        action: { notIn: [...SESSION_ACTIONS] },
      },
      _count: { _all: true },
    }),
    prisma.auditEvent.findMany({
      where: {
        organizationId,
        actorUserId: actorFilter,
        createdAt: timestampRange,
        action: { notIn: [...SESSION_ACTIONS] },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, actorUserId: true, category: true, action: true, entityType: true, entityId: true, createdAt: true, actor: { select: personSelect } },
    }),
    prisma.auditEvent.findMany({
      where: {
        organizationId,
        actorUserId: actorFilter,
        category: "team",
        action: { in: [...SESSION_ACTIONS] },
        createdAt: timestampRange,
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        actorUserId: true,
        action: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: personSelect },
      },
    }),
  ]);

  const actionCount = new Map(counts.flatMap((item) => item.actorUserId ? [[item.actorUserId, item._count._all] as const] : []));
  const profileMap = new Map(profiles.map((profile) => [profile.userId, profile]));

  const sessionsById = new Map<string, {
    sessionId: string;
    userId: string;
    name: string;
    email: string;
    startedAt: Date | null;
    endedAt: Date | null;
    lastActivityAt: Date | null;
    endReason: string | null;
  }>();

  for (const event of sessionEvents) {
    if (!event.actorUserId || !event.entityId) continue;
    const key = `${event.actorUserId}:${event.entityId}`;
    const current = sessionsById.get(key) ?? {
      sessionId: event.entityId,
      userId: event.actorUserId,
      name: event.actor?.name ?? "Usuário removido",
      email: event.actor?.email ?? "",
      startedAt: null,
      endedAt: null,
      lastActivityAt: null,
      endReason: null,
    };
    if (event.action === "team.session.started") current.startedAt = event.createdAt;
    if (event.action === "team.session.ended") {
      current.endedAt = event.createdAt;
      current.endReason = metadataReason(event.metadata);
    }
    sessionsById.set(key, current);
  }

  const latestOpenSessionByUser = new Map<string, { key: string; startedAt: Date }>();
  for (const [key, session] of sessionsById) {
    if (!session.startedAt || session.endedAt) continue;
    const current = latestOpenSessionByUser.get(session.userId);
    if (!current || session.startedAt > current.startedAt) {
      latestOpenSessionByUser.set(session.userId, { key, startedAt: session.startedAt });
    }
  }
  for (const [memberId, open] of latestOpenSessionByUser) {
    const profile = profileMap.get(memberId);
    const session = sessionsById.get(open.key);
    if (session && profile?.lastActiveAt && profile.lastActiveAt >= open.startedAt) {
      session.lastActivityAt = profile.lastActiveAt;
    }
  }

  const sessions = Array.from(sessionsById.values())
    .filter((session) => session.startedAt)
    .map((session) => {
      const durationEnd = session.endedAt ?? session.lastActivityAt;
      return {
        ...session,
        durationMinutes: session.startedAt ? minutesBetween(session.startedAt, durationEnd) : null,
        endReasonLabel: sessionReasonLabel(session.endReason),
      };
    })
    .sort((a, b) => (b.startedAt?.getTime() ?? 0) - (a.startedAt?.getTime() ?? 0));

  const members = profiles.map((profile) => {
    const memberSessions = sessions.filter((session) => session.userId === profile.userId);
    const firstEntry = memberSessions.length
      ? memberSessions.reduce<Date | null>((min, session) => !session.startedAt ? min : !min || session.startedAt < min ? session.startedAt : min, null)
      : null;
    const explicitExits = memberSessions.map((session) => session.endedAt).filter((value): value is Date => Boolean(value));
    const lastExit = explicitExits.length ? explicitExits.reduce((max, value) => value > max ? value : max) : null;
    return {
      userId: profile.userId,
      name: profile.user.name,
      email: profile.user.email,
      status: profile.status,
      actions: actionCount.get(profile.userId) ?? 0,
      firstEntry,
      lastExit,
      lastActivityAt: profile.lastActiveAt,
    };
  }).sort((a, b) => b.actions - a.actions || a.name.localeCompare(b.name, "pt-BR"));

  return { members, sessions, recent };
}

export async function getReportExportRows(input: {
  organizationId: string;
  period: ReportPeriod;
  type: "processes" | "work-items" | "publications" | "finance" | "team";
  userId?: string | null;
}) {
  const dateRange = { gte: input.period.fromDate, lt: input.period.toDateExclusive };
  const timestampRange = { gte: input.period.fromTimestamp, lt: input.period.toTimestampExclusive };
  const userId = input.userId || undefined;

  if (input.type === "processes") return prisma.process.findMany({
    where: { organizationId: input.organizationId, createdAt: timestampRange, ...(userId ? { responsibleUserId: userId } : {}) }, orderBy: { createdAt: "desc" }, take: 5000,
    select: { internalCode: true, cnjFormatted: true, status: true, subject: true, court: true, district: true, caseValue: true, createdAt: true, responsible: { select: { name: true } }, clients: { where: { isPrimary: true }, take: 1, select: { client: { select: { name: true, tradeName: true } } } } },
  });
  if (input.type === "work-items") return prisma.processWorkItem.findMany({
    where: { organizationId: input.organizationId, dueDate: dateRange, ...(userId ? { responsibleUserId: userId } : {}) }, orderBy: { dueDate: "asc" }, take: 5000,
    select: { kind: true, title: true, dueDate: true, dueTime: true, priority: true, isFatal: true, status: true, completedAt: true, responsible: { select: { name: true } }, process: { select: { internalCode: true, cnjFormatted: true } } },
  });
  if (input.type === "publications") return prisma.publication.findMany({
    where: { organizationId: input.organizationId, publicationDate: dateRange, ...(userId ? { OR: [{ readByUserId: userId }, { treatedByUserId: userId }] } : {}) }, orderBy: { publicationDate: "desc" }, take: 5000,
    select: { kind: true, communicationType: true, court: true, judicialBody: true, processNumberFormatted: true, publicationDate: true, sourceStatus: true, readAt: true, treatedAt: true, process: { select: { internalCode: true } } },
  });
  if (input.type === "finance") return prisma.processFinanceEntry.findMany({
    where: { organizationId: input.organizationId, entryDate: dateRange, ...(userId ? { createdByUserId: userId } : {}) }, orderBy: { entryDate: "desc" }, take: 5000,
    select: { kind: true, description: true, amount: true, entryDate: true, status: true, paidBy: true, reimbursable: true, process: { select: { internalCode: true, cnjFormatted: true } } },
  });
  const teamProfiles = await prisma.teamMemberProfile.findMany({
    where: { organizationId: input.organizationId, ...(userId ? { userId } : {}) },
    select: { userId: true },
  });
  const staffIds = teamProfiles.map((profile) => profile.userId);
  if (staffIds.length === 0) return [];
  return prisma.auditEvent.findMany({
    where: { organizationId: input.organizationId, actorUserId: { in: staffIds }, createdAt: timestampRange }, orderBy: { createdAt: "desc" }, take: 5000,
    select: { category: true, action: true, entityType: true, entityId: true, createdAt: true, actor: { select: { name: true, email: true } } },
  });
}

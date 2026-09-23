import { prisma } from "@/infrastructure/database/prisma";
import { normalizeDjenItem } from "@/modules/integrations/djen/domain/djen-publication";
import { auditActionLabel, auditCategoryLabel } from "@/shared/audit/audit-labels";
import { saoPauloTodayString } from "@/modules/work-items/domain/work-item-date";

export type DashboardMetric = {
  label: string;
  value: number;
  helper: string;
  tone: "blue" | "amber" | "red" | "slate";
  href: string;
};

export type DashboardAttention = {
  id: string;
  level: string;
  title: string;
  meta: string;
  href: string;
  action: string;
  tone: "blue" | "amber" | "red" | "slate";
};

export type DashboardActivity = {
  id: string;
  time: string;
  title: string;
  meta: string;
  actor: string;
  href?: string;
};

export type DashboardAgendaItem = {
  id: string;
  date: string;
  day: string;
  month: string;
  title: string;
  meta: string;
  href: string;
};

export type DashboardTeamMember = {
  id: string;
  name: string;
  detail: string;
};

export type DashboardData = {
  metrics: DashboardMetric[];
  attention: DashboardAttention[];
  activity: DashboardActivity[];
  agenda: DashboardAgendaItem[];
  team: DashboardTeamMember[];
  processStats: { active: number; movedLast30Days: number; withoutRecentMovement: number; total: number };
  latestDjenAt: string | null;
};

function startOfTodayUtc() {
  return new Date(`${saoPauloTodayString()}T00:00:00.000Z`);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function datePt(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function timePt(date: Date) {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
}

function agendaDateParts(date: Date) {
  return {
    date: date.toISOString(),
    day: date.toLocaleDateString("pt-BR", { timeZone: "UTC", day: "2-digit" }),
    month: date.toLocaleDateString("pt-BR", { timeZone: "UTC", month: "short" }).replace(".", "").toUpperCase(),
  };
}

export async function getDashboardData(input: {
  organizationId: string;
  userId: string;
  role: string;
}): Promise<DashboardData> {
  const today = startOfTodayUtc();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 8);
  const thirtyDaysAgo = addDays(today, -30);
  const staffScope = input.role === "owner" ? {} : { OR: [{ responsibleUserId: input.userId }, { responsibleUserId: null }] };

  const [
    publicationNew,
    intimationToday,
    pendingCandidatesRows,
    deadlinesToday,
    highDeadlinesToday,
    overdueDeadlines,
    upcomingHearings,
    pendingTasks,
    assignedTasks,
    activeProcesses,
    movedProcesses,
    staleProcessesCount,
    totalProcesses,
    latestPublication,
    urgentWork,
    untreatedPublications,
    hearingAttention,
    staleProcess,
    auditEvents,
    agendaWork,
    agendaEvents,
    teamProfiles,
  ] = await Promise.all([
    prisma.publication.count({ where: { organizationId: input.organizationId, kind: "PUBLICATION", sourceStatus: "ACTIVE", treatedAt: null } }),
    prisma.publication.count({ where: { organizationId: input.organizationId, kind: "INTIMATION", sourceStatus: "ACTIVE", treatedAt: null } }),
    input.role === "owner" ? prisma.djenReviewCandidate.findMany({ where: { organizationId: input.organizationId, status: "PENDING" }, select: { payload: true } }) : Promise.resolve([]),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, kind: "DEADLINE", status: "OPEN", dueDate: { gte: today, lt: tomorrow }, ...staffScope } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, kind: "DEADLINE", status: "OPEN", priority: "HIGH", dueDate: { gte: today, lt: tomorrow }, ...staffScope } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, kind: "DEADLINE", status: "OPEN", dueDate: { lt: today }, ...staffScope } }),
    prisma.agendaEvent.count({ where: { organizationId: input.organizationId, type: "HEARING", status: "OPEN", eventDate: { gte: today, lt: nextWeek }, ...staffScope } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, kind: "TASK", status: "OPEN", ...staffScope } }),
    prisma.processWorkItem.count({ where: { organizationId: input.organizationId, kind: "TASK", status: "OPEN", responsibleUserId: input.userId } }),
    prisma.process.count({ where: { organizationId: input.organizationId, status: "ACTIVE" } }),
    prisma.process.count({ where: { organizationId: input.organizationId, status: "ACTIVE", updatedAt: { gte: thirtyDaysAgo } } }),
    prisma.process.count({ where: { organizationId: input.organizationId, status: "ACTIVE", updatedAt: { lt: thirtyDaysAgo } } }),
    prisma.process.count({ where: { organizationId: input.organizationId } }),
    prisma.publication.findFirst({ where: { organizationId: input.organizationId, source: "DJEN" }, orderBy: { capturedAt: "desc" }, select: { capturedAt: true } }),
    prisma.processWorkItem.findMany({
      where: { organizationId: input.organizationId, kind: "DEADLINE", status: "OPEN", dueDate: { lt: addDays(today, 2) }, ...staffScope },
      select: { id: true, title: true, dueDate: true, dueTime: true, isFatal: true, process: { select: { id: true, internalCode: true, cnjFormatted: true } } },
      orderBy: [{ dueDate: "asc" }, { isFatal: "desc" }],
      take: 3,
    }),
    prisma.publication.findMany({
      where: { organizationId: input.organizationId, sourceStatus: "ACTIVE", treatedAt: null },
      select: { id: true, kind: true, communicationType: true, capturedAt: true, processNumberFormatted: true, process: { select: { internalCode: true } } },
      orderBy: { capturedAt: "desc" },
      take: 2,
    }),
    prisma.agendaEvent.findMany({
      where: { organizationId: input.organizationId, type: "HEARING", status: "OPEN", eventDate: { gte: today, lt: nextWeek }, ...staffScope },
      select: { id: true, title: true, eventDate: true, startTime: true, processId: true, process: { select: { internalCode: true } } },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      take: 2,
    }),
    prisma.process.findFirst({
      where: { organizationId: input.organizationId, status: "ACTIVE", updatedAt: { lt: thirtyDaysAgo } },
      select: { id: true, internalCode: true, subject: true, updatedAt: true, responsible: { select: { name: true } } },
      orderBy: { updatedAt: "asc" },
    }),
    prisma.auditEvent.findMany({
      where: { organizationId: input.organizationId, action: { notIn: ["notification.read", "report.daily_email_sent", "report.daily_email_failed"] }, ...(input.role === "owner" ? {} : { actorUserId: input.userId }) },
      select: { id: true, action: true, category: true, entityType: true, entityId: true, metadata: true, createdAt: true, actor: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.processWorkItem.findMany({
      where: { organizationId: input.organizationId, status: "OPEN", dueDate: { gte: today, lt: nextWeek }, ...staffScope },
      select: { id: true, kind: true, title: true, dueDate: true, dueTime: true, process: { select: { id: true, internalCode: true } } },
      orderBy: [{ dueDate: "asc" }, { dueTime: "asc" }],
      take: 6,
    }),
    prisma.agendaEvent.findMany({
      where: { organizationId: input.organizationId, status: "OPEN", eventDate: { gte: today, lt: nextWeek }, ...staffScope },
      select: { id: true, type: true, title: true, eventDate: true, startTime: true, processId: true, process: { select: { internalCode: true } } },
      orderBy: [{ eventDate: "asc" }, { startTime: "asc" }],
      take: 6,
    }),
    input.role === "owner" ? prisma.teamMemberProfile.findMany({
      where: { organizationId: input.organizationId, status: "ACTIVE" },
      select: { id: true, lastActiveAt: true, user: { select: { name: true, _count: { select: { processesResponsible: true } } } } },
      orderBy: [{ lastActiveAt: "desc" }, { createdAt: "asc" }],
      take: 4,
    }) : Promise.resolve([]),
  ]);

  const pendingCandidates = pendingCandidatesRows.length;
  const pendingByKind = { PUBLICATION: 0, INTIMATION: 0 };
  for (const candidate of pendingCandidatesRows) {
    try { pendingByKind[normalizeDjenItem(candidate.payload).kind]++; }
    catch { /* Dados inconsistentes não podem derrubar o painel inteiro. */ }
  }

  const metrics: DashboardMetric[] = [
    { label: "Publicações pendentes", value: publicationNew + pendingByKind.PUBLICATION, helper: "inclui resultados para revisão", tone: "blue", href: "/app/publicacoes?view=untreated&kind=PUBLICATION" },
    { label: "Intimações pendentes", value: intimationToday + pendingByKind.INTIMATION, helper: "inclui resultados para revisão", tone: "blue", href: "/app/publicacoes?view=untreated&kind=INTIMATION" },
    ...(input.role === "owner" ? [{ label: "Para revisão", value: pendingCandidates, helper: "identificação do destinatário", tone: "amber" as const, href: "/app/publicacoes?view=untreated" }] : []),
    { label: "Prazos hoje", value: deadlinesToday, helper: highDeadlinesToday ? `${highDeadlinesToday} com prioridade alta` : "para acompanhar hoje", tone: "amber", href: "/app/prazos?view=today&kind=DEADLINE" },
    { label: "Prazos atrasados", value: overdueDeadlines, helper: overdueDeadlines ? "exigem ação" : "nenhum em atraso", tone: "red", href: "/app/prazos?view=overdue&kind=DEADLINE" },
    { label: "Audiências", value: upcomingHearings, helper: "nos próximos 7 dias", tone: "slate", href: "/app/agenda?view=week" },
    { label: "Tarefas pendentes", value: pendingTasks, helper: `${assignedTasks} atribuída${assignedTasks === 1 ? "" : "s"} a você`, tone: "slate", href: "/app/prazos?view=all&kind=TASK" },
  ];

  const attention: DashboardAttention[] = [];
  for (const item of urgentWork) {
    const overdue = !!item.dueDate && item.dueDate < today;
    const fatal = item.isFatal;
    attention.push({
      id: `work:${item.id}`,
      level: overdue ? "Atrasado" : fatal ? "Fatal" : "Hoje",
      title: item.title,
      meta: `${item.process.internalCode} · ${item.dueDate ? datePt(item.dueDate) : "sem data"}${item.dueTime ? ` às ${item.dueTime}` : ""}`,
      href: `/app/processos/${item.process.id}?tab=prazos`,
      action: "Abrir prazo",
      tone: overdue || fatal ? "red" : "amber",
    });
  }
  for (const item of untreatedPublications) {
    attention.push({
      id: `publication:${item.id}`,
      level: "Novo",
      title: item.kind === "INTIMATION" ? "Intimação ainda não tratada" : "Publicação ainda não tratada",
      meta: `${item.process?.internalCode || item.processNumberFormatted || "Comunicação sem processo"} · ${item.communicationType}`,
      href: `/app/publicacoes/${item.id}`,
      action: "Revisar",
      tone: "blue",
    });
  }
  for (const item of hearingAttention) {
    attention.push({
      id: `agenda:${item.id}`,
      level: "Agenda",
      title: item.title,
      meta: `${datePt(item.eventDate)}${item.startTime ? ` às ${item.startTime}` : ""}${item.process?.internalCode ? ` · ${item.process.internalCode}` : ""}`,
      href: item.processId ? `/app/processos/${item.processId}` : "/app/agenda?view=week",
      action: "Abrir",
      tone: "amber",
    });
  }
  if (staleProcess && attention.length < 6) {
    const inactiveDays = Math.max(30, Math.floor((today.getTime() - staleProcess.updatedAt.getTime()) / 86_400_000));
    attention.push({
      id: `process:${staleProcess.id}`,
      level: "Atenção",
      title: `Processo há ${inactiveDays} dias sem atualização`,
      meta: `${staleProcess.internalCode}${staleProcess.subject ? ` · ${staleProcess.subject}` : ""}${staleProcess.responsible?.name ? ` · ${staleProcess.responsible.name}` : ""}`,
      href: `/app/processos/${staleProcess.id}`,
      action: "Abrir",
      tone: "slate",
    });
  }

  const activity: DashboardActivity[] = auditEvents.map((event) => {
    const metadata = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? event.metadata as Record<string, unknown> : {};
    const kind = metadata.kind === "INTIMATION" ? "Intimação" : "Publicação";
    const isCapture = event.action === "publication.capture_completed" || event.action === "publication.capture_partial";
    const publicationAction = event.action === "publication.captured" || event.action === "publication.process_linked" || event.action === "publication.review_candidate_received";
    return {
      id: event.id,
      time: timePt(event.createdAt),
      title: event.action === "publication.captured" ? `${kind} recebida do DJeN`
        : event.action === "publication.review_candidate_received" ? `${kind} aguardando conferência` : auditActionLabel(event.action),
      meta: isCapture
        ? `${typeof metadata.newPublications === "number" ? metadata.newPublications : 0} novas · ${typeof metadata.reviewCandidates === "number" ? metadata.reviewCandidates : 0} para revisão`
        : publicationAction ? `DJeN · ${typeof metadata.cnj === "string" ? metadata.cnj : "abrir publicações para conferir"}`
        : auditCategoryLabel(event.category),
      actor: event.actor?.name || "Sistema",
      ...(publicationAction && event.entityType === "publication" ? { href: `/app/publicacoes/${event.entityId}` } : {}),
      ...(publicationAction && event.entityType === "djen_review_candidate" ? { href: `/app/publicacoes/revisao#${event.entityId}` } : {}),
    };
  });

  const workAgenda: DashboardAgendaItem[] = agendaWork.flatMap((item) => {
    if (!item.dueDate) return [];
    return [{
      id: `work:${item.id}`,
      ...agendaDateParts(item.dueDate),
      title: item.title,
      meta: `${item.kind === "DEADLINE" ? "Prazo" : "Tarefa"}${item.dueTime ? ` · ${item.dueTime}` : ""} · ${item.process.internalCode}`,
      href: `/app/processos/${item.process.id}?tab=prazos`,
    }];
  });

  const agendaMerged: DashboardAgendaItem[] = [
    ...workAgenda,
    ...agendaEvents.map((item) => ({
      id: `agenda:${item.id}`,
      ...agendaDateParts(item.eventDate),
      title: item.title,
      meta: `${item.type === "HEARING" ? "Audiência" : "Compromisso"}${item.startTime ? ` · ${item.startTime}` : ""}${item.process?.internalCode ? ` · ${item.process.internalCode}` : ""}`,
      href: item.processId ? `/app/processos/${item.processId}` : "/app/agenda",
    })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  const tenMinutesAgo = Date.now() - 10 * 60_000;
  const team: DashboardTeamMember[] = teamProfiles.map((profile) => {
    const active = !!profile.lastActiveAt && profile.lastActiveAt.getTime() >= tenMinutesAgo;
    const activityText = active
      ? "ativa agora"
      : profile.lastActiveAt
        ? `última atividade ${timePt(profile.lastActiveAt)}`
        : "ainda sem atividade registrada";
    return {
      id: profile.id,
      name: profile.user.name,
      detail: `${activityText} · ${profile.user._count.processesResponsible} processo${profile.user._count.processesResponsible === 1 ? "" : "s"}`,
    };
  });

  return {
    metrics,
    attention: attention.slice(0, 6),
    activity,
    agenda: agendaMerged,
    team,
    processStats: { active: activeProcesses, movedLast30Days: movedProcesses, withoutRecentMovement: staleProcessesCount, total: totalProcesses },
    latestDjenAt: latestPublication?.capturedAt.toISOString() ?? null,
  };
}

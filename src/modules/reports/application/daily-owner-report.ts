import { prisma } from "@/infrastructure/database/prisma";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";
import { getReportData } from "./report-service";
import { resolveReportPeriod } from "../domain/report-period";
import { sendReportEmail } from "../infrastructure/report-email";
import { processStatusLabel, workKindLabel, workStatusLabel } from "../domain/report-labels";
import { auditActionLabel } from "@/shared/audit/audit-labels";
import { getOrganizationNotificationSettings } from "@/modules/settings/application/settings-service";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function brDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
}

function brMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function durationLabel(minutes: number | null) {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h ${String(rest).padStart(2, "0")}min` : `${rest} min`;
}

function todayPeriod(now: Date) {
  const current = resolveReportPeriod({ preset: "month", now });
  return resolveReportPeriod({ preset: "custom", from: current.to, to: current.to, now });
}

function renderDailyReportHtml(input: {
  organizationName: string;
  ownerName: string;
  periodDate: string;
  appUrl: string;
  data: Awaited<ReturnType<typeof getReportData>>;
}) {
  const sessions = input.data.team?.sessions ?? [];
  const activity = input.data.team?.recent.slice(0, 20) ?? [];
  const processes = input.data.processes.slice(0, 15);
  const workItems = input.data.workItems.slice(0, 15);

  const sessionRows = sessions.length
    ? sessions.map((session) => `
      <tr>
        <td>${escapeHtml(session.name)}</td>
        <td>${escapeHtml(brDateTime(session.startedAt))}</td>
        <td>${escapeHtml(session.endedAt ? brDateTime(session.endedAt) : "Não registrada")}</td>
        <td>${escapeHtml(session.lastActivityAt ? brDateTime(session.lastActivityAt) : "—")}</td>
        <td>${escapeHtml(durationLabel(session.durationMinutes))}</td>
        <td>${escapeHtml(session.endReasonLabel)}</td>
      </tr>`).join("")
    : '<tr><td colspan="6">Nenhuma sessão de funcionário registrada hoje.</td></tr>';

  const processRows = processes.length
    ? processes.map((item) => `<tr><td>${escapeHtml(item.internalCode)}</td><td>${escapeHtml(item.clients[0]?.client.tradeName || item.clients[0]?.client.name || "Sem cliente principal")}</td><td>${escapeHtml(item.responsible?.name || "Sem responsável")}</td><td>${escapeHtml(processStatusLabel(item.status))}</td></tr>`).join("")
    : '<tr><td colspan="4">Nenhum processo cadastrado hoje.</td></tr>';

  const workRows = workItems.length
    ? workItems.map((item) => `<tr><td>${escapeHtml(workKindLabel(item.kind))}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.responsible?.name || "Sem responsável")}</td><td>${escapeHtml(workStatusLabel(item.status))}</td></tr>`).join("")
    : '<tr><td colspan="4">Nenhum prazo ou tarefa com data de hoje.</td></tr>';

  const activityRows = activity.length
    ? activity.map((event) => `<tr><td>${escapeHtml(brDateTime(event.createdAt))}</td><td>${escapeHtml(event.actor?.name || "Usuário removido")}</td><td>${escapeHtml(auditActionLabel(event.action))}</td></tr>`).join("")
    : '<tr><td colspan="3">Nenhuma atividade auditável registrada hoje.</td></tr>';

  const reportUrl = `${input.appUrl.replace(/\/$/, "")}/app/relatorios?preset=custom&from=${input.periodDate}&to=${input.periodDate}`;

  return `
  <div style="font-family:Arial,sans-serif;max-width:960px;margin:auto;color:#172033;line-height:1.45">
    <div style="padding:22px 0;border-bottom:1px solid #e4e7ec">
      <h1 style="font-size:24px;margin:0 0 6px">Relatório diário do Jurisportal</h1>
      <p style="margin:0;color:#667085">${escapeHtml(input.organizationName)} · ${escapeHtml(input.periodDate.split("-").reverse().join("/"))}</p>
    </div>
    <p>Olá, ${escapeHtml(input.ownerName)}. Este relatório usa os mesmos dados da área de Relatórios reservada ao proprietário.</p>

    <table style="width:100%;border-collapse:collapse;margin:18px 0">
      <tr>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Processos ativos</strong><br>${input.data.summary.activeProcesses}</td>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Prazos/tarefas abertos</strong><br>${input.data.summary.openWorkItems}</td>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Atrasados</strong><br>${input.data.summary.overdueWorkItems}</td>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Publicações hoje</strong><br>${input.data.summary.capturedPublications}</td>
      </tr>
      <tr>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Honorários recebidos</strong><br>${escapeHtml(brMoney(input.data.summary.receivedFees))}</td>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Custos pagos</strong><br>${escapeHtml(brMoney(input.data.summary.paidCosts))}</td>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Honorários pendentes</strong><br>${escapeHtml(brMoney(input.data.summary.pendingFees))}</td>
        <td style="padding:12px;border:1px solid #e4e7ec"><strong>Revisões de prazo</strong><br>${input.data.summary.pendingDeadlineReviews}</td>
      </tr>
    </table>

    <h2 style="font-size:17px;margin-top:26px">Entrada e saída da equipe</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Funcionário</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Entrada</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Saída</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Última atividade</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Duração</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Motivo</th></tr></thead>
      <tbody>${sessionRows}</tbody>
    </table>

    <h2 style="font-size:17px;margin-top:26px">Processos cadastrados hoje</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Referência</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Cliente</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Responsável</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Status</th></tr></thead><tbody>${processRows}</tbody></table>

    <h2 style="font-size:17px;margin-top:26px">Prazos e tarefas de hoje</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Tipo</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Item</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Responsável</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Status</th></tr></thead><tbody>${workRows}</tbody></table>

    <h2 style="font-size:17px;margin-top:26px">Atividade recente da equipe</h2>
    <table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Horário</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Usuário</th><th style="text-align:left;padding:8px;border-bottom:1px solid #e4e7ec">Ação</th></tr></thead><tbody>${activityRows}</tbody></table>

    <div style="margin-top:26px;padding:16px;background:#f7f9fc;border-radius:10px">
      <a href="${escapeHtml(reportUrl)}" style="color:#1555d6;font-weight:700">Abrir relatório completo no Jurisportal</a>
      <p style="font-size:12px;color:#667085;margin:8px 0 0">O Jurisportal registra somente atividades realizadas dentro da aplicação. Quando não há logout explícito, o relatório mostra a última atividade conhecida e não inventa uma hora de saída.</p>
    </div>
  </div>`;
}

function renderDailyReportText(input: {
  organizationName: string;
  ownerName: string;
  periodDate: string;
  data: Awaited<ReturnType<typeof getReportData>>;
}) {
  const lines = [
    `Relatório diário do Jurisportal - ${input.organizationName}`,
    input.periodDate.split("-").reverse().join("/"),
    "",
    `Olá, ${input.ownerName}.`,
    `Processos ativos: ${input.data.summary.activeProcesses}`,
    `Prazos e tarefas abertos: ${input.data.summary.openWorkItems}`,
    `Itens atrasados: ${input.data.summary.overdueWorkItems}`,
    `Publicações no dia: ${input.data.summary.capturedPublications}`,
    `Honorários recebidos: ${brMoney(input.data.summary.receivedFees)}`,
    `Custos pagos: ${brMoney(input.data.summary.paidCosts)}`,
    "",
    "Entrada e saída da equipe:",
  ];
  const sessions = input.data.team?.sessions ?? [];
  if (!sessions.length) lines.push("Nenhuma sessão de funcionário registrada hoje.");
  for (const session of sessions) {
    lines.push(`${session.name}: entrada ${brDateTime(session.startedAt)}; saída ${session.endedAt ? brDateTime(session.endedAt) : "não registrada"}; última atividade ${session.lastActivityAt ? brDateTime(session.lastActivityAt) : "—"}; ${session.endReasonLabel}.`);
  }
  lines.push("", "O Jurisportal registra somente atividades realizadas dentro da aplicação.");
  return lines.join("\n");
}

export async function sendDailyOwnerReports(now = new Date()) {
  const period = todayPeriod(now);
  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      subscription: { select: { planSlug: true, status: true } },
      members: {
        where: { role: "owner" },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { user: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  const result = { sent: 0, skipped: 0, failed: 0 };
  for (const organization of organizations) {
    const owner = organization.members[0]?.user;
    const subscription = organization.subscription;
    const plan = subscription ? planCatalog.find((item) => item.slug === subscription.planSlug) : undefined;
    if (!owner || !plan || !hasCapability(plan, "reports.basic") || ["canceled", "expired"].includes(subscription?.status ?? "")) {
      result.skipped += 1;
      continue;
    }

    const notificationSettings = await getOrganizationNotificationSettings(organization.id);
    if (!notificationSettings.dailyOwnerReportEmail) {
      result.skipped += 1;
      continue;
    }

    const alreadySent = await prisma.auditEvent.findFirst({
      where: {
        organizationId: organization.id,
        category: "reports",
        action: "report.daily_email_sent",
        entityType: "daily_owner_report",
        entityId: period.from,
      },
      select: { id: true },
    });
    if (alreadySent) {
      result.skipped += 1;
      continue;
    }

    try {
      const data = await getReportData({
        organizationId: organization.id,
        period,
        includeAdvanced: hasCapability(plan, "reports.advanced"),
        includeTeamActivity: hasCapability(plan, "team.activity"),
      });
      const appUrl = process.env.BETTER_AUTH_URL || "";
      const deliveryId = await sendReportEmail({
        to: owner.email,
        subject: `Relatório diário do Jurisportal - ${organization.name} - ${period.from.split("-").reverse().join("/")}`,
        text: renderDailyReportText({ organizationName: organization.name, ownerName: owner.name, periodDate: period.from, data }),
        html: renderDailyReportHtml({ organizationName: organization.name, ownerName: owner.name, periodDate: period.from, appUrl, data }),
      });
      await prisma.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorUserId: null,
          category: "reports",
          action: "report.daily_email_sent",
          entityType: "daily_owner_report",
          entityId: period.from,
          metadata: { recipient: owner.email, ownerUserId: owner.id, deliveryId, scheduledHour: "20:00", timeZone: "America/Sao_Paulo" },
        },
      });
      result.sent += 1;
    } catch (error) {
      console.error(`[reports] Falha no relatório diário de ${organization.id}`, error);
      await prisma.auditEvent.create({
        data: {
          organizationId: organization.id,
          actorUserId: null,
          category: "reports",
          action: "report.daily_email_failed",
          entityType: "daily_owner_report",
          entityId: period.from,
          metadata: { recipient: owner.email, message: error instanceof Error ? error.message.slice(0, 500) : "Erro desconhecido" },
        },
      }).catch(() => undefined);
      result.failed += 1;
    }
  }

  return { ...result, date: period.from };
}

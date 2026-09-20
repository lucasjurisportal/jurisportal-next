import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { getReportExportRows } from "@/modules/reports/application/report-service";
import { resolveReportPeriod } from "@/modules/reports/domain/report-period";
import { financeKindLabel, financeStatusLabel, processStatusLabel, publicationStatusLabel, workKindLabel, workStatusLabel } from "@/modules/reports/domain/report-labels";
import { createCsv } from "@/modules/reports/infrastructure/report-csv";
import { auditActionLabel, auditCategoryLabel } from "@/shared/audit/audit-labels";

export const runtime = "nodejs";

type ExportType = "processes" | "work-items" | "publications" | "finance" | "team";
const validTypes = new Set<ExportType>(["processes", "work-items", "publications", "finance", "team"]);

function brDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "";
}

function brDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
}

function money(value: unknown) {
  return value == null ? "" : Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function GET(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (context.workspace.role !== "owner") return NextResponse.json({ error: "REPORTS_OWNER_REQUIRED" }, { status: 403 });
  if (!hasCapability(context.workspace.plan, "reports.basic")) return NextResponse.json({ error: "REPORTS_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });

  const url = new URL(request.url);
  const rawType = url.searchParams.get("type") as ExportType | null;
  if (!rawType || !validTypes.has(rawType)) return NextResponse.json({ error: "INVALID_REPORT_TYPE" }, { status: 422 });
  if (rawType === "team" && (!hasCapability(context.workspace.plan, "team.activity") || context.workspace.role !== "owner")) {
    return NextResponse.json({ error: "TEAM_ACTIVITY_NOT_AVAILABLE" }, { status: 403 });
  }

  const period = resolveReportPeriod({ preset: url.searchParams.get("preset") ?? undefined, from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
  const userId = url.searchParams.get("userId") || undefined;
  if (userId) {
    const [membership, teamProfile] = await Promise.all([
      prisma.member.findUnique({
        where: { organizationId_userId: { organizationId: context.workspace.organizationId, userId } },
        select: { id: true },
      }),
      prisma.teamMemberProfile.findFirst({
        where: { organizationId: context.workspace.organizationId, userId },
        select: { id: true },
      }),
    ]);
    if (!membership && !teamProfile) return NextResponse.json({ error: "INVALID_REPORT_USER" }, { status: 422 });
  }
  const rows: any[] = await getReportExportRows({ organizationId: context.workspace.organizationId, period, type: rawType, userId });

  let csv = "";
  if (rawType === "processes") {
    csv = createCsv(["Referência", "CNJ", "Cliente principal", "Assunto", "Tribunal", "Comarca", "Responsável", "Status", "Valor da causa", "Cadastrado em"], rows.map((item) => [item.internalCode, item.cnjFormatted, item.clients[0]?.client.tradeName || item.clients[0]?.client.name || "", item.subject, item.court, item.district, item.responsible?.name, processStatusLabel(item.status), money(item.caseValue), brDateTime(item.createdAt)]));
  } else if (rawType === "work-items") {
    csv = createCsv(["Tipo", "Título", "Referência", "CNJ", "Data", "Hora", "Responsável", "Prioridade", "Fatal", "Status", "Concluído em"], rows.map((item) => [workKindLabel(item.kind), item.title, item.process.internalCode, item.process.cnjFormatted, brDate(item.dueDate), item.dueTime, item.responsible?.name, item.priority, item.isFatal ? "Sim" : "Não", workStatusLabel(item.status), brDateTime(item.completedAt)]));
  } else if (rawType === "publications") {
    csv = createCsv(["Tipo", "Comunicação", "Referência", "Processo", "Tribunal", "Órgão", "Data", "Situação", "Lida em", "Tratada em"], rows.map((item) => [item.kind, item.communicationType, item.process?.internalCode, item.processNumberFormatted, item.court, item.judicialBody, brDate(item.publicationDate), publicationStatusLabel(item), brDateTime(item.readAt), brDateTime(item.treatedAt)]));
  } else if (rawType === "finance") {
    csv = createCsv(["Tipo", "Descrição", "Referência", "CNJ", "Data", "Valor", "Status", "Pago por", "Reembolsável"], rows.map((item) => [financeKindLabel(item.kind), item.description, item.process.internalCode, item.process.cnjFormatted, brDate(item.entryDate), money(item.amount), financeStatusLabel(item.status), item.paidBy, item.reimbursable ? "Sim" : "Não"]));
  } else {
    csv = createCsv(["Usuário", "E-mail", "Categoria", "Ação", "Entidade", "Data e hora"], rows.map((item) => [item.actor?.name, item.actor?.email, auditCategoryLabel(item.category), auditActionLabel(item.action), item.entityType, brDateTime(item.createdAt)]));
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      category: "reports",
      action: "report.csv_exported",
      entityType: "report",
      metadata: { type: rawType, from: period.from, to: period.to, userId: userId ?? null, rowCount: rows.length },
    },
  });

  const filename = `jurisportal-${rawType}-${period.from}-${period.to}.csv`;
  return new Response(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
    },
  });
}

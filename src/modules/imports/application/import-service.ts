import { prisma } from "@/infrastructure/database/prisma";
import type { PlanDefinition } from "@/modules/plans/domain/plan.types";
import { clientInputSchema, type ClientInput } from "@/modules/clients/domain/client.schema";
import { createClient } from "@/modules/clients/application/client-service";
import { digitsOnly } from "@/modules/clients/domain/tax-id";
import { processInputSchema, type ProcessInput } from "@/modules/processes/domain/process.schema";
import { createProcess } from "@/modules/processes/application/process-service";
import { normalizeCnjDigits } from "@/modules/processes/domain/cnj-number";
import { fieldsFor, suggestMapping, type ImportKind } from "../domain/import-definition";
import { parseTabularFile } from "../infrastructure/tabular-file";

export type ImportMapping = Record<string, string>;

export type ImportPreviewRow = {
  rowNumber: number;
  status: "ready" | "duplicate" | "invalid" | "limit";
  label: string;
  values: Record<string, string>;
  errors: string[];
};

export type ImportPreview = {
  kind: ImportKind;
  fileName: string;
  headers: string[];
  mapping: ImportMapping;
  fields: ReturnType<typeof fieldsFor>;
  totalRows: number;
  readyRows: number;
  duplicateRows: number;
  invalidRows: number;
  limitRows: number;
  previewRows: ImportPreviewRow[];
};

function value(row: Record<string, string>, mapping: ImportMapping, key: string): string {
  const header = mapping[key];
  return header ? (row[header] ?? "").trim() : "";
}

function normalizeDate(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (!match) return text;
  return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
}

function parseMoney(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  const clean = text.replace(/R\$/gi, "").replace(/\s/g, "");
  const normalized = clean.includes(",")
    ? clean.replace(/\./g, "").replace(",", ".")
    : clean.replace(/,(?=\d{3}(\D|$))/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : Number.NaN;
}

function clientKind(raw: string, taxId: string): "PF" | "PJ" {
  const normalized = raw.trim().toUpperCase();
  if (["PJ", "JURIDICA", "JURÍDICA", "PESSOA JURIDICA", "PESSOA JURÍDICA"].includes(normalized)) return "PJ";
  if (["PF", "FISICA", "FÍSICA", "PESSOA FISICA", "PESSOA FÍSICA"].includes(normalized)) return "PF";
  return digitsOnly(taxId).length === 14 ? "PJ" : "PF";
}

function mappedValues(row: Record<string, string>, mapping: ImportMapping, kind: ImportKind) {
  return Object.fromEntries(fieldsFor(kind).map((field) => [field.key, value(row, mapping, field.key)]));
}

function zodMessages(error: { issues: readonly { message: string; path: readonly PropertyKey[] }[] }) {
  return error.issues.map((issue) => `${String(issue.path[0] ?? "campo")}: ${issue.message}`);
}

function splitDocuments(raw: string): string[] {
  if (!raw.trim()) return [];
  return [...new Set(raw.split(/[;,|\n]+/).map(digitsOnly).filter(Boolean))];
}

function remaining(limit: number | "unlimited", current: number) {
  return limit === "unlimited" ? Number.POSITIVE_INFINITY : Math.max(0, limit - current);
}

async function previewClients(input: {
  organizationId: string;
  plan: PlanDefinition;
  rows: Array<Record<string, string>>;
  mapping: ImportMapping;
}): Promise<ImportPreviewRow[]> {
  const existing = new Set((await prisma.client.findMany({
    where: { organizationId: input.organizationId },
    select: { taxIdNormalized: true },
  })).map((item) => item.taxIdNormalized));
  const currentCount = existing.size;
  let capacity = remaining(input.plan.clientsLimit, currentCount);
  const seen = new Set<string>();

  return input.rows.map((row, index) => {
    const values = mappedValues(row, input.mapping, "clients");
    const taxId = digitsOnly(values.taxId);
    const kind = clientKind(values.kind, values.taxId);
    const data: ClientInput = {
      kind,
      name: values.name,
      tradeName: values.tradeName,
      taxId: values.taxId,
      birthDate: normalizeDate(values.birthDate),
      primaryContactName: values.primaryContactName,
      email: values.email,
      whatsapp: values.whatsapp,
      phone: values.phone,
      postalCode: values.postalCode,
      street: values.street,
      number: values.number,
      complement: values.complement,
      district: values.district,
      city: values.city,
      state: values.state.toUpperCase() as ClientInput["state"],
      notes: values.notes,
    };
    const parsed = clientInputSchema.safeParse(data);
    const errors = parsed.success ? [] : zodMessages(parsed.error);
    let status: ImportPreviewRow["status"] = errors.length ? "invalid" : "ready";
    if (!errors.length && taxId && (existing.has(taxId) || seen.has(taxId))) {
      status = "duplicate";
      errors.push(existing.has(taxId) ? "CPF/CNPJ já cadastrado neste escritório." : "CPF/CNPJ repetido no próprio arquivo.");
    }
    if (status === "ready") {
      if (capacity <= 0) {
        status = "limit";
        errors.push("A importação ultrapassaria o limite de clientes do plano.");
      } else {
        capacity -= 1;
        seen.add(taxId);
      }
    }
    return {
      rowNumber: index + 2,
      status,
      label: values.name || `Linha ${index + 2}`,
      values: { ...values, kind },
      errors,
    };
  });
}

async function previewProcesses(input: {
  organizationId: string;
  plan: PlanDefinition;
  rows: Array<Record<string, string>>;
  mapping: ImportMapping;
}): Promise<ImportPreviewRow[]> {
  const [clients, members, existingProcesses, processCount] = await Promise.all([
    prisma.client.findMany({ where: { organizationId: input.organizationId }, select: { id: true, taxIdNormalized: true, name: true } }),
    prisma.member.findMany({ where: { organizationId: input.organizationId }, include: { user: { select: { id: true, email: true, name: true } } } }),
    prisma.process.findMany({ where: { organizationId: input.organizationId }, select: { cnjNormalized: true } }),
    prisma.process.count({ where: { organizationId: input.organizationId } }),
  ]);
  const clientByTaxId = new Map<string, { id: string; taxIdNormalized: string; name: string }>(
    clients.map((client) => [client.taxIdNormalized, client] as const),
  );
  const memberByEmail = new Map<string, { id: string; email: string; name: string }>(
    members.map((member) => [member.user.email.toLowerCase(), member.user] as const),
  );
  const existing = new Set(existingProcesses.map((item) => item.cnjNormalized));
  const seen = new Set<string>();
  let capacity = remaining(input.plan.registeredProcessLimit, processCount);

  return input.rows.map((row, index) => {
    const values = mappedValues(row, input.mapping, "processes");
    const errors: string[] = [];
    const primaryTaxId = digitsOnly(values.primaryClientTaxId);
    const primaryClient = clientByTaxId.get(primaryTaxId);
    if (!primaryClient) errors.push("Cliente principal não encontrado pelo CPF/CNPJ. Importe/cadastre o cliente antes do processo.");

    const additionalDocs = splitDocuments(values.additionalClientTaxIds).filter((doc) => doc !== primaryTaxId);
    const additionalClients = additionalDocs.map((doc) => clientByTaxId.get(doc));
    if (additionalClients.some((client) => !client)) errors.push("Um ou mais clientes adicionais não foram encontrados pelo CPF/CNPJ.");

    const responsibleEmail = values.responsibleEmail.trim().toLowerCase();
    const responsible = responsibleEmail ? memberByEmail.get(responsibleEmail) : undefined;
    if (responsibleEmail && !responsible) errors.push("Responsável não pertence à equipe deste escritório ou o e-mail não confere.");

    const money = parseMoney(values.caseValue);
    if (Number.isNaN(money)) errors.push("Valor da causa inválido.");

    const data: ProcessInput = {
      cnj: values.cnj,
      primaryClientId: primaryClient?.id ?? "00000000-0000-0000-0000-000000000000",
      additionalClientIds: additionalClients.filter(Boolean).map((client) => client!.id),
      responsibleUserId: responsible?.id ?? "",
      court: values.court,
      division: values.division,
      district: values.district,
      processClass: values.processClass,
      subject: values.subject,
      otherSubjects: [],
      caseValue: Number.isNaN(money) ? null : money,
      distributionDate: normalizeDate(values.distributionDate),
      notes: values.notes,
      parties: values.opposingParty ? [{ name: values.opposingParty, role: values.opposingPartyRole || "Parte contrária", document: "" }] : [],
    };
    if (primaryClient) {
      const parsed = processInputSchema.safeParse(data);
      if (!parsed.success) errors.push(...zodMessages(parsed.error));
    }

    const cnj = normalizeCnjDigits(values.cnj);
    let status: ImportPreviewRow["status"] = errors.length ? "invalid" : "ready";
    if (!errors.length && cnj && (existing.has(cnj) || seen.has(cnj))) {
      status = "duplicate";
      errors.push(existing.has(cnj) ? "CNJ já cadastrado neste escritório." : "CNJ repetido no próprio arquivo.");
    }
    if (status === "ready") {
      if (capacity <= 0) {
        status = "limit";
        errors.push("A importação ultrapassaria o limite de processos do plano.");
      } else {
        capacity -= 1;
        seen.add(cnj);
      }
    }

    return {
      rowNumber: index + 2,
      status,
      label: values.cnj || `Linha ${index + 2}`,
      values: { ...values, primaryClient: primaryClient?.name ?? "", responsible: responsible?.name ?? "" },
      errors,
    };
  });
}

export async function previewImport(input: {
  organizationId: string;
  plan: PlanDefinition;
  kind: ImportKind;
  file: File;
  mapping?: ImportMapping;
}): Promise<ImportPreview> {
  const table = await parseTabularFile(input.file);
  const mapping = input.mapping && Object.keys(input.mapping).length ? input.mapping : suggestMapping(input.kind, table.headers);
  const rows = input.kind === "clients"
    ? await previewClients({ organizationId: input.organizationId, plan: input.plan, rows: table.rows, mapping })
    : await previewProcesses({ organizationId: input.organizationId, plan: input.plan, rows: table.rows, mapping });
  return {
    kind: input.kind,
    fileName: input.file.name,
    headers: table.headers,
    mapping,
    fields: fieldsFor(input.kind),
    totalRows: rows.length,
    readyRows: rows.filter((row) => row.status === "ready").length,
    duplicateRows: rows.filter((row) => row.status === "duplicate").length,
    invalidRows: rows.filter((row) => row.status === "invalid").length,
    limitRows: rows.filter((row) => row.status === "limit").length,
    previewRows: rows.slice(0, 100),
  };
}

export async function commitImport(input: {
  organizationId: string;
  actorUserId: string;
  plan: PlanDefinition;
  kind: ImportKind;
  file: File;
  mapping: ImportMapping;
}) {
  const preview = await previewImport({ organizationId: input.organizationId, plan: input.plan, kind: input.kind, file: input.file, mapping: input.mapping });
  if (preview.readyRows === 0) return { ...preview, imported: 0, failedDuringCommit: 0 };
  const table = await parseTabularFile(input.file);
  // previewRows mostra no máximo 100; para arquivos maiores revalida linha a linha abaixo sem confiar nessa lista.
  let imported = 0;
  let failedDuringCommit = 0;

  if (input.kind === "clients") {
    const allPreview = await previewClients({ organizationId: input.organizationId, plan: input.plan, rows: table.rows, mapping: input.mapping });
    for (let index = 0; index < table.rows.length; index += 1) {
      if (allPreview[index]?.status !== "ready") continue;
      const values = mappedValues(table.rows[index], input.mapping, "clients");
      const taxId = values.taxId;
      const data = clientInputSchema.parse({
        kind: clientKind(values.kind, taxId), name: values.name, tradeName: values.tradeName, taxId,
        birthDate: normalizeDate(values.birthDate), primaryContactName: values.primaryContactName, email: values.email,
        whatsapp: values.whatsapp, phone: values.phone, postalCode: values.postalCode, street: values.street,
        number: values.number, complement: values.complement, district: values.district, city: values.city,
        state: values.state.toUpperCase(), notes: values.notes,
      });
      try {
        await createClient({ organizationId: input.organizationId, actorUserId: input.actorUserId, clientLimit: input.plan.clientsLimit, data, source: "IMPORT" });
        imported += 1;
      } catch {
        failedDuringCommit += 1;
      }
    }
  } else {
    const allPreview = await previewProcesses({ organizationId: input.organizationId, plan: input.plan, rows: table.rows, mapping: input.mapping });
    const clients = await prisma.client.findMany({ where: { organizationId: input.organizationId }, select: { id: true, taxIdNormalized: true } });
    const members = await prisma.member.findMany({ where: { organizationId: input.organizationId }, include: { user: { select: { id: true, email: true } } } });
    const clientByTaxId = new Map<string, string>(
      clients.map((client) => [client.taxIdNormalized, client.id] as const),
    );
    const memberByEmail = new Map<string, string>(
      members.map((member) => [member.user.email.toLowerCase(), member.user.id] as const),
    );
    for (let index = 0; index < table.rows.length; index += 1) {
      if (allPreview[index]?.status !== "ready") continue;
      const values = mappedValues(table.rows[index], input.mapping, "processes");
      const primaryTaxId = digitsOnly(values.primaryClientTaxId);
      const primaryClientId = clientByTaxId.get(primaryTaxId);
      if (!primaryClientId) { failedDuringCommit += 1; continue; }
      const additionalClientIds = splitDocuments(values.additionalClientTaxIds)
        .filter((doc) => doc !== primaryTaxId)
        .map((doc) => clientByTaxId.get(doc))
        .filter((id): id is string => Boolean(id));
      const money = parseMoney(values.caseValue);
      const data = processInputSchema.parse({
        cnj: values.cnj,
        primaryClientId,
        additionalClientIds,
        responsibleUserId: values.responsibleEmail ? memberByEmail.get(values.responsibleEmail.toLowerCase()) ?? "" : "",
        court: values.court, division: values.division, district: values.district, processClass: values.processClass,
        subject: values.subject, caseValue: Number.isNaN(money) ? null : money, distributionDate: normalizeDate(values.distributionDate), notes: values.notes,
        parties: values.opposingParty ? [{ name: values.opposingParty, role: values.opposingPartyRole || "Parte contrária", document: "" }] : [],
      });
      try {
        await createProcess({ organizationId: input.organizationId, actorUserId: input.actorUserId, processLimit: input.plan.registeredProcessLimit, data, source: "IMPORT" });
        imported += 1;
      } catch {
        failedDuringCommit += 1;
      }
    }
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      category: "imports",
      action: input.kind === "clients" ? "import.clients.completed" : "import.processes.completed",
      entityType: "organization",
      entityId: input.organizationId,
      metadata: {
        fileName: input.file.name,
        totalRows: preview.totalRows,
        readyRows: preview.readyRows,
        imported,
        failedDuringCommit,
        duplicateRows: preview.duplicateRows,
        invalidRows: preview.invalidRows,
        limitRows: preview.limitRows,
      },
    },
  });

  return { ...preview, imported, failedDuringCommit };
}

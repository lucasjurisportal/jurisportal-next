import { createHash } from "node:crypto";
import { formatCnjNumber, normalizeCnjDigits } from "@/modules/processes/domain/cnj-number";
import { normalizeOabNumber } from "@/modules/lawyers/domain/oab";

export type DjenLawyer = {
  name: string;
  oab: string;
  state: string;
};

export type DjenParty = {
  name: string;
  role: string;
};

export type NormalizedDjenPublication = {
  externalId: string | null;
  hash: string | null;
  externalKey: string;
  processNumberRaw: string | null;
  processNumberNormalized: string | null;
  processNumberFormatted: string | null;
  court: string | null;
  communicationType: string;
  kind: "PUBLICATION" | "INTIMATION";
  documentType: string | null;
  judicialBody: string | null;
  publicationDate: string;
  content: string;
  summary: string;
  lawyers: DjenLawyer[];
  parties: DjenParty[];
  explicitDates: string[];
  sourceUrl: string | null;
  sourceStatus: "ACTIVE" | "CANCELLED";
  cancellationReason: string | null;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === "object" ? (value as UnknownRecord) : {};
}

function stringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function booleanValue(...values: unknown[]): boolean | null {
  for (const value of values) if (typeof value === "boolean") return value;
  return null;
}

/**
 * O texto vindo do DJeN é externo e pode conter HTML. No Jurisportal ele vira texto puro.
 * Assim nenhuma classe, style, script ou handler externo entra na interface.
 */
export function sanitizeDjenContent(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|table|li|h[1-6])>/gi, "\n")
    .replace(/<(p|div|tr|table|li|h[1-6])[^>]*>/gi, "")
    .replace(/<td[^>]*>/gi, " ")
    .replace(/<\/td>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function validIsoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Apenas localiza datas literalmente escritas. Não interpreta prazo jurídico. */
export function extractExplicitDates(text: string): string[] {
  const found = new Set<string>();
  const brPattern = /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/g;
  const isoPattern = /\b(\d{4})-(\d{2})-(\d{2})\b/g;

  for (const match of text.matchAll(brPattern)) {
    const value = validIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
    if (value) found.add(value);
  }
  for (const match of text.matchAll(isoPattern)) {
    const value = validIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
    if (value) found.add(value);
  }
  return [...found].sort();
}

export function normalizeOabForComparison(value: string): string {
  return normalizeOabNumber(value);
}

/** Compara identidade completa; falta de nome ou sufixo divergente nunca vira match automático. */
export function normalizeLawyerName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleUpperCase("pt-BR").replace(/[^A-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

export function publicationTargetsOab(
  publication: NormalizedDjenPublication,
  oab: string,
  uf: string,
  registeredName: string,
): boolean {
  const normalizedOab = normalizeOabForComparison(oab);
  const normalizedUf = uf.trim().toUpperCase();
  const normalizedName = normalizeLawyerName(registeredName);
  if (!normalizedOab || !normalizedName || normalizedName === "NAO INFORMADO") return false;
  return publication.lawyers.some((lawyer) => {
    const sourceName = normalizeLawyerName(lawyer.name);
    return normalizeOabForComparison(lawyer.oab) === normalizedOab
      && lawyer.state.trim().toUpperCase() === normalizedUf
      && sourceName === normalizedName;
  });
}

/**
 * Gera formas defensivas da OAB para a consulta externa. O banco continua com uma única OAB normalizada.
 * Isso existe porque a origem pode registrar complementos com ou sem hífen.
 */
export function buildOabQueryVariants(rawNumber: string, normalizedNumber: string): string[] {
  const values = new Set<string>();
  const raw = rawNumber.trim().toUpperCase();
  const normalized = normalizedNumber.trim().toUpperCase();
  if (raw) values.add(raw);
  if (normalized) values.add(normalized);

  const suffixMatch = normalized.match(/^(\d+)([A-Z])$/);
  if (suffixMatch) values.add(`${suffixMatch[1]}-${suffixMatch[2]}`);

  // Não fabricar inscrições com sufixos não cadastrados: gera busca excessiva e
  // risco de sugerir publicações de advogados com modalidade distinta.

  return [...values];
}

function normalizeProcessNumber(value: string | null) {
  if (!value) return { raw: null, normalized: null, formatted: null };
  const digits = normalizeCnjDigits(value);
  if (digits.length !== 20) return { raw: value, normalized: digits || null, formatted: value };
  return { raw: value, normalized: digits, formatted: formatCnjNumber(digits) };
}

function normalizePublicationDate(value: string | null): string {
  if (!value) throw new Error("DJEN_PUBLICATION_DATE_MISSING");
  // A consulta oficial informa a data de DISPONIBILIZACAO, que nao e prazo nem
  // necessariamente o dia juridico da publicacao. Nao usar data_publicacao como fallback.
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:$|\s)/);
  const valid = iso
    ? validIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))
    : br ? validIsoDate(Number(br[3]), Number(br[2]), Number(br[1])) : null;
  if (!valid) throw new Error("DJEN_PUBLICATION_DATE_INVALID");
  return valid;
}

function classifyCommunication(value: string): "PUBLICATION" | "INTIMATION" {
  return value.toLocaleLowerCase("pt-BR").includes("intima") ? "INTIMATION" : "PUBLICATION";
}

/** Resumo determinístico: não inventa ato, data nem vencimento. */
export function summarizeDjenContent(content: string): string {
  const compact = content.replace(/\s+/g, " ").trim();
  return compact.length > 320 ? `${compact.slice(0, 319).trimEnd()}…` : compact;
}

/** Links externos só são expostos se forem HTTPS e tiverem domínio do Judiciário. */
export function officialDjenUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    const host = url.hostname.toLowerCase();
    if (host !== "jus.br" && !host.endsWith(".jus.br")) return null;
    return url.toString();
  } catch { return null; }
}

function makeExternalKey(input: {
  hash: string | null;
  externalId: string | null;
  process: string | null;
  date: string;
  type: string;
  content: string;
}) {
  // ID da comunicação permanece estável mesmo se o hash mudar em retificação/cancelamento.
  if (input.externalId) return `id:${input.externalId}`;
  if (input.hash) return `hash:${input.hash}`;
  return `sha256:${createHash("sha256")
    .update([input.process, input.date, input.type, input.content].join("|"))
    .digest("hex")}`;
}

export function normalizeDjenItem(value: unknown): NormalizedDjenPublication {
  const item = asRecord(value);
  const processRaw = stringValue(item.numeroprocessocommascara, item.numeroProcesso, item.numero_processo);
  const process = normalizeProcessNumber(processRaw);
  const communicationType = stringValue(item.tipoComunicacao, item.tipo_comunicacao) ?? "Não informado";
  const publicationDate = normalizePublicationDate(
    stringValue(item.datadisponibilizacao, item.dataDisponibilizacao, item.data_disponibilizacao),
  );
  const rawContent = stringValue(item.texto, item.conteudo) ?? "";
  const content = sanitizeDjenContent(rawContent);
  const hash = stringValue(item.hash);
  const externalId = stringValue(item.id, item.numeroComunicacao, item.numero_comunicacao);

  const lawyersRaw = Array.isArray(item.destinatarioadvogados) ? item.destinatarioadvogados : [];
  const lawyers = lawyersRaw.map((entry) => {
    const lawyer = asRecord(asRecord(entry).advogado);
    return {
      name: stringValue(lawyer.nome) ?? "Não informado",
      oab: stringValue(lawyer.numero_oab, lawyer.numeroOab) ?? "",
      state: (stringValue(lawyer.uf_oab, lawyer.ufOab) ?? "").toUpperCase(),
    };
  });

  const partiesRaw = Array.isArray(item.destinatarios) ? item.destinatarios : [];
  const parties = partiesRaw.map((entry) => {
    const party = asRecord(entry);
    return {
      name: stringValue(party.nome) ?? "Não informado",
      role: stringValue(party.polo) ?? "Não informado",
    };
  });

  const cancellationReason = stringValue(item.motivo_cancelamento, item.motivoCancelamento);
  const active = booleanValue(item.ativo, item.active);
  const sourceStatus = cancellationReason || active === false ? "CANCELLED" as const : "ACTIVE" as const;
  const sourceUrl = officialDjenUrl(stringValue(item.link, item.url));
  const explicitDates = extractExplicitDates(content);

  return {
    externalId,
    hash,
    externalKey: makeExternalKey({ hash, externalId, process: process.normalized, date: publicationDate, type: communicationType, content }),
    processNumberRaw: process.raw,
    processNumberNormalized: process.normalized,
    processNumberFormatted: process.formatted,
    court: stringValue(item.siglaTribunal, item.tribunal),
    communicationType,
    kind: classifyCommunication(communicationType),
    documentType: stringValue(item.tipoDocumento, item.tipo_documento),
    judicialBody: stringValue(item.nomeOrgao, item.orgao),
    publicationDate,
    content,
    summary: summarizeDjenContent(content),
    lawyers,
    parties,
    explicitDates,
    sourceUrl,
    sourceStatus,
    cancellationReason,
  };
}

import { normalizeCnjDigits } from "@/modules/processes/domain/cnj-number";

/** Dados derivados de fonte processual; nunca representam cadastro confirmado. */
export type ProcessLookupPreview = {
  source: "DATAJUD_PUBLIC";
  cnj: string;
  court: string | null;
  division: string | null;
  district: string | null;
  forum: string | null;
  processClass: string | null;
  subject: string | null;
  filingDate: string | null;
  distributionDate: null;
  degree: string | null;
  electronicSystem: string | null;
  movementsAvailable: number;
  notice: string;
};

const stateCodes: Record<string, string> = {
  "01": "tjac", "02": "tjal", "03": "tjap", "04": "tjam", "05": "tjba", "06": "tjce", "07": "tjdft",
  "08": "tjes", "09": "tjgo", "10": "tjma", "11": "tjmt", "12": "tjms", "13": "tjmg", "14": "tjpa",
  "15": "tjpb", "16": "tjpr", "17": "tjpe", "18": "tjpi", "19": "tjrj", "20": "tjrn", "21": "tjrs",
  "22": "tjro", "23": "tjrr", "24": "tjsc", "25": "tjse", "26": "tjsp", "27": "tjto",
};

/** Branch + tribunal do CNJ, sem supor que OAB/UF revela onde tramita o processo. */
export function courtAliasForCnj(cnj: string): string | null {
  const digits = normalizeCnjDigits(cnj);
  if (!/^\d{20}$/.test(digits)) return null;
  const branch = digits[13];
  const tribunal = digits.slice(14, 16);
  if (branch === "8") return stateCodes[tribunal] ?? null;
  const n = Number(tribunal);
  if (branch === "5" && n >= 1 && n <= 6) return `trf${n}`;
  if (branch === "4" && n >= 1 && n <= 24) return `trt${n}`;
  return null; // Outros ramos exigem mapeamento explícito/documentado.
}

const obj = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};
const text = (value: unknown, max = 160): string | null => typeof value === "string" && value.trim()
  ? value.trim().slice(0, max) : null;
function dateOnly(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (!match) return null;
  const out = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${out}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === out ? out : null;
}
function named(value: unknown, max = 160): string | null {
  return text(value, max) ?? text(obj(value).nome, max);
}

/** Retorna SOMENTE campos amparados pela fonte. Nem código IBGE nem nome do órgão provam fórum/comarca. */
export function normalizeDatajudProcess(value: unknown, requestedCnj: string): ProcessLookupPreview | null {
  const source = obj(value);
  const cnj = normalizeCnjDigits(String(source.numeroProcesso ?? ""));
  if (!/^\d{20}$/.test(cnj) || cnj !== normalizeCnjDigits(requestedCnj)) return null;
  const unit = obj(source.orgaoJulgador);
  const subjects = Array.isArray(source.assuntos) ? source.assuntos : [];
  const principal = subjects.find((item) => obj(item).principal === true);
  const subject = named(principal, 300) ?? (subjects.length === 1 ? named(subjects[0], 300) : null);
  return {
    source: "DATAJUD_PUBLIC", cnj,
    court: text(source.tribunal, 120), division: text(unit.nome, 120),
    district: text(source.comarca, 120), forum: text(source.forum, 160),
    processClass: named(source.classe, 120), subject,
    filingDate: dateOnly(source.dataAjuizamento), distributionDate: null,
    degree: text(source.grau, 80), electronicSystem: text(source.sistema, 120),
    movementsAvailable: Array.isArray(source.movimentos) ? source.movimentos.length : 0,
    notice: "Dados informados pela fonte externa; revise antes de salvar. Ajuizamento não é data de distribuição. Fórum e comarca não são inferidos pelo CNJ.",
  };
}

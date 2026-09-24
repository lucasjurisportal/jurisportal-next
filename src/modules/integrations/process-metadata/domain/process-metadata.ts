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
  otherSubjects: string[];
  caseValue: string | null;
  distributionDate: string | null;
  degree: string | null;
  electronicSystem: string | null;
  movementsAvailable: number;
  municipalityIbgeCode: number | null;
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
  if (branch === "4" && n >= 1 && n <= 6) return `trf${n}`;
  if (branch === "5" && n >= 1 && n <= 24) return `trt${n}`;
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
function moneyFromSource(value: unknown): string | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 && value <= 999999999999.99 ? value.toFixed(2) : null;
  if (typeof value === "string" && /^\d{1,12}(?:\.\d{1,2})?$/.test(value.trim())) return Number(value).toFixed(2);
  return null;
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
  const names = [...new Set(subjects.map((item) => named(item, 300)).filter((item): item is string => item !== null))];
  const principal = subjects.find((item) => obj(item).principal === true);
  const subject = named(principal, 300) ?? (names.length === 1 ? names[0] : null);
  // Sem marcação de principal e com vários assuntos, nenhum vira principal por acaso.
  // Guardamos todos como assuntos adicionais para o advogado classificar depois.
  const otherSubjects = names.filter((name) => name !== subject).slice(0, 30);
  return {
    source: "DATAJUD_PUBLIC", cnj,
    court: text(source.tribunal, 120), division: text(unit.nome, 120),
    district: text(source.comarca, 120), forum: text(source.forum, 160),
    processClass: named(source.classe, 120), subject, otherSubjects,
    caseValue: moneyFromSource(source.valorCausa), distributionDate: dateOnly(source.dataDistribuicao),
    degree: text(source.grau, 80), electronicSystem: named(source.sistema, 120),
    movementsAvailable: Array.isArray(source.movimentos) ? source.movimentos.length : 0,
    municipalityIbgeCode: typeof unit.codigoMunicipioIBGE === "number" && Number.isInteger(unit.codigoMunicipioIBGE)
      ? unit.codigoMunicipioIBGE : null,
    notice: "Comarca, fórum, valor da causa e distribuição só são preenchidos quando a fonte os informa expressamente. Confira os campos faltantes na capa oficial do processo.",
  };
}

/** Movimentações externas são dados de consulta, separados de DJeN e da linha do tempo interna. */
export type ExternalProcessMovement = {
  source: "DATAJUD_PUBLIC";
  code: number | null;
  name: string;
  occurredAt: string | null;
  judicialBody: string | null;
};

export function normalizeDatajudMovements(value: unknown, maxItems = 100): {
  items: ExternalProcessMovement[]; total: number; truncated: boolean;
} {
  const source = obj(value);
  const raw = Array.isArray(source.movimentos) ? source.movimentos : [];
  const total = raw.length;
  // A ordem devolvida pelo tribunal não é garantida. Cortar antes de ordenar
  // deixava apenas os 100 movimentos mais antigos de alguns processos.
  const items = raw.map((entry) => {
    const movement = obj(entry);
    const judicialBody = obj(movement.orgaoJulgador);
    const rawDate = movement.dataHora;
    let occurredAt: string | null = null;
    if (typeof rawDate === "string" && /^\d{4}-?\d{2}-?\d{2}/.test(rawDate)) {
      const normalized = /^\d{14}$/.test(rawDate)
        ? `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}T${rawDate.slice(8, 10)}:${rawDate.slice(10, 12)}:${rawDate.slice(12, 14)}`
        : rawDate;
      const check = new Date(normalized);
      if (!Number.isNaN(check.getTime())) occurredAt = normalized; // não inventar fuso onde fonte não forneceu
    }
    return {
      source: "DATAJUD_PUBLIC" as const,
      code: typeof movement.codigo === "number" && Number.isInteger(movement.codigo) ? movement.codigo : null,
      name: named(movement, 240) ?? "Movimentação sem descrição na fonte",
      occurredAt,
      judicialBody: text(judicialBody.nomeOrgao, 160),
    };
  });
  items.sort((a, b) => (b.occurredAt ?? "").localeCompare(a.occurredAt ?? ""));
  return { items: items.slice(0, maxItems), total, truncated: total > maxItems };
}

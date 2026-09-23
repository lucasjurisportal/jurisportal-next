/** Apenas metadados EXPRESSOS na fonte. Não inferir fórum pela comarca nem
 * distribuição pela disponibilização da publicação ou ajuizamento. */
export type DjenProcessMetadata = {
  distributionDate: string | null;
  processClass: string | null;
  subject: string | null;
  district: string | null;
  forum: string | null;
};
type RecordLike = Record<string, unknown>;
const record = (v: unknown): RecordLike => v && typeof v === "object" && !Array.isArray(v) ? v as RecordLike : {};
const string = (v: unknown): string | null => typeof v === "string" && v.trim() ? v.trim() : null;
const limited = (v: string | null, max: number) => v ? v.slice(0, max) : null;
function date(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const m = value.match(/^(\d{4})-(\d\d)-(\d\d)(?:$|T|\s)/);
  const br = value.match(/^(\d\d)\/(\d\d)\/(\d{4})$/);
  const out = m ? `${m[1]}-${m[2]}-${m[3]}` : br ? `${br[3]}-${br[2]}-${br[1]}` : null;
  if (!out) return null;
  const d = new Date(`${out}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === out ? out : null;
}
function named(value: unknown): string | null {
  return string(value) ?? string(record(value).nome);
}
/** Não interpreta nomes de cidades sem prefixo explícito Comarca. */
export function extractComarcaFromUnit(value: string | null): string | null {
  if (!value) return null;
  const m = value.match(/\bComarca\s+d[aeo]\s+([\p{L}\p{M}\s'\-]+?)(?:\s*[-–,()]|$)/iu);
  return limited(m?.[1]?.trim() ?? null, 120);
}
export function extractDjenProcessMetadata(value: unknown, judicialBody: string | null): DjenProcessMetadata {
  const raw = record(value);
  const subjects = Array.isArray(raw.assuntos) ? raw.assuntos : [];
  const principal = subjects.find((v) => record(v).principal === true);
  const subject = named(raw.assuntoPrincipal) ?? named(principal)
    ?? (subjects.length === 1 ? named(subjects[0]) : null);
  return {
    distributionDate: date(raw.dataDistribuicao ?? raw.data_distribuicao),
    processClass: limited(named(raw.classeProcessual) ?? named(raw.classe), 120),
    subject: limited(subject, 300),
    district: limited(string(raw.comarca) ?? extractComarcaFromUnit(judicialBody), 120),
    // Não transformar o órgão julgador em fórum. São conceitos diferentes.
    forum: limited(string(raw.forum) ?? string(raw.nomeForum), 160),
  };
}

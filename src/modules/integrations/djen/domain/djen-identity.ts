import { normalizeLawyerName, normalizeOabForComparison, type NormalizedDjenPublication } from "./djen-publication";

export function djenCandidateReason(
  publication: NormalizedDjenPublication, oab: string, state: string, name: string,
): string {
  const exactOab = publication.lawyers.some((lawyer) =>
    normalizeOabForComparison(lawyer.oab) === normalizeOabForComparison(oab)
    && lawyer.state.toUpperCase() === state.toUpperCase());
  const exactName = publication.lawyers.some((lawyer) =>
    normalizeLawyerName(lawyer.name) === normalizeLawyerName(name));
  if (!publication.lawyers.length) return "SEM_OAB_NA_FONTE";
  if (exactOab) return "NOME_DIVERGENTE";
  if (exactName) return "OAB_DIVERGENTE_OU_HOMONIMO";
  return "IDENTIDADE_NAO_CONFIRMADA";
}

/** Evita entupir a fila com resultados de busca textual que não dizem respeito ao nome pesquisado. */
export function isPotentialDjenCandidate(input: {
  publication: NormalizedDjenPublication; oab: string; state: string;
  registeredName: string; mode: "OAB" | "NAME";
}): boolean {
  const lawyers = input.publication.lawyers;
  if (!lawyers.length) return true; // busca trouxe item sem destinatário: revisão, nunca match automático
  if (input.mode === "NAME") return lawyers.some((lawyer) =>
    normalizeLawyerName(lawyer.name) === normalizeLawyerName(input.registeredName));
  // A consulta por OAB/UF pode devolver destinatários com campo incompleto ou divergente.
  // Não associar automaticamente e não jogar fora o retorno: deixar o proprietário conferir.
  // Isso NÃO valida a identidade, apenas coloca o resultado na fila do escritório consultado.
  return true;
}

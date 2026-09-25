/** Áreas operacionais sugeridas. Não são classes processuais oficiais, nem enum no banco. */
export const PROCESS_AREA_OPTIONS = [
  "Cível",
  "Trabalhista",
  "Penal",
  "Previdenciário",
  "Tributário",
  "Empresarial",
  "Administrativo",
  "Família e Sucessões",
  "Consumidor",
  "Eleitoral",
  "Militar",
  "Ambiental",
  "Imobiliário",
  "Agrário",
  "Direitos Humanos",
] as const;

export const CUSTOM_PROCESS_AREA = "__jurisportal_custom_area__";
export const UNCLASSIFIED_PROCESS_AREA = "__jurisportal_unclassified_area__";

export function isSuggestedProcessArea(value: string): boolean {
  return PROCESS_AREA_OPTIONS.some((area) => area === value);
}

/** Somente filtro de visualização: não normaliza nem reclassifica processos antigos. */
export function normalizedAreaFilter(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value || value === CUSTOM_PROCESS_AREA || value.length > 100) return undefined;
  return value;
}

export type AreaGroup = { caseType: string | null; _count: { id: number } };
/** Contagens vindas exclusivamente da organização autenticada, para montar o filtro. */
export function processAreaFilterOptions(groups: AreaGroup[]) {
  const options = new Map<string, { label: string; count: number }>();
  let unclassified = 0;
  for (const group of groups) {
    const label = group.caseType?.trim();
    if (!label) {
      unclassified += group._count.id;
      continue;
    }
    const key = label.toLocaleLowerCase("pt-BR");
    const previous = options.get(key);
    options.set(key, { label: previous?.label ?? label, count: (previous?.count ?? 0) + group._count.id });
  }
  return {
    classified: [...options.values()].sort((a, b) => a.label.localeCompare(b.label, "pt-BR")),
    unclassified,
  };
}

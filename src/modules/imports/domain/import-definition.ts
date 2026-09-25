export type ImportKind = "clients" | "processes";

export type ImportField = {
  key: string;
  label: string;
  required: boolean;
  aliases: readonly string[];
  help?: string;
};

export const clientImportFields: readonly ImportField[] = [
  { key: "kind", label: "Tipo PF/PJ", required: false, aliases: ["tipo", "tipo pessoa", "pf pj", "natureza"] },
  { key: "name", label: "Nome / Razão social", required: true, aliases: ["nome", "razao social", "razão social", "cliente", "nome cliente"] },
  { key: "tradeName", label: "Nome fantasia", required: false, aliases: ["nome fantasia", "fantasia"] },
  { key: "taxId", label: "CPF/CNPJ", required: true, aliases: ["cpf", "cnpj", "cpf cnpj", "documento", "documento cliente"] },
  { key: "birthDate", label: "Data de nascimento", required: false, aliases: ["data nascimento", "nascimento", "dt nascimento"] },
  { key: "primaryContactName", label: "Contato principal (PJ)", required: false, aliases: ["contato", "contato principal", "responsavel", "responsável"] },
  { key: "email", label: "E-mail", required: true, aliases: ["email", "e-mail", "e mail"] },
  { key: "whatsapp", label: "WhatsApp", required: true, aliases: ["whatsapp", "celular", "telefone whatsapp"] },
  { key: "phone", label: "Telefone", required: false, aliases: ["telefone", "fone"] },
  { key: "postalCode", label: "CEP", required: true, aliases: ["cep", "codigo postal", "código postal"] },
  { key: "street", label: "Logradouro", required: true, aliases: ["logradouro", "rua", "endereco", "endereço"] },
  { key: "number", label: "Número", required: true, aliases: ["numero", "número", "nº", "num"] },
  { key: "complement", label: "Complemento", required: false, aliases: ["complemento", "compl"] },
  { key: "district", label: "Bairro", required: true, aliases: ["bairro"] },
  { key: "city", label: "Cidade", required: true, aliases: ["cidade", "municipio", "município"] },
  { key: "state", label: "UF", required: true, aliases: ["uf", "estado"] },
  { key: "notes", label: "Observações", required: false, aliases: ["observacoes", "observações", "notas", "obs"] },
] as const;

export const processImportFields: readonly ImportField[] = [
  { key: "cnj", label: "Número CNJ", required: true, aliases: ["cnj", "numero cnj", "número cnj", "numero processo", "número processo", "processo"] },
  { key: "primaryClientTaxId", label: "CPF/CNPJ do cliente principal", required: true, aliases: ["cpf cliente", "cnpj cliente", "cpf cnpj cliente", "documento cliente", "cliente cpf", "cliente cnpj"] },
  { key: "additionalClientTaxIds", label: "CPF/CNPJ de clientes adicionais", required: false, aliases: ["clientes adicionais", "documentos adicionais", "cpf cnpj adicionais"] },
  { key: "responsibleEmail", label: "E-mail do responsável", required: false, aliases: ["responsavel email", "responsável email", "email responsavel", "email responsável", "advogado email"] },
  { key: "court", label: "Tribunal", required: false, aliases: ["tribunal", "court"] },
  { key: "division", label: "Vara / Unidade", required: false, aliases: ["vara", "unidade", "vara unidade", "órgão julgador", "orgao julgador"] },
  { key: "district", label: "Comarca", required: false, aliases: ["comarca", "foro"] },
  { key: "forum", label: "Fórum", required: false, aliases: ["fórum", "forum", "foro judicial"] },
  { key: "caseType", label: "Área do Direito", required: false, aliases: ["area do direito", "área do direito", "area juridica", "área jurídica", "tipo area", "tipo de processo", "ramo do direito"] },
  { key: "processClass", label: "Ação / procedimento", required: false, aliases: ["classe", "classe processual", "procedimento", "acao procedimento", "ação procedimento"] },
  { key: "subject", label: "Assunto principal", required: false, aliases: ["assunto", "assunto principal", "materia", "matéria"] },
  { key: "otherSubjects", label: "Outros assuntos", required: false, aliases: ["outros assuntos", "assuntos adicionais", "outros assuntos do processo"] },
  { key: "caseValue", label: "Valor da causa", required: false, aliases: ["valor causa", "valor da causa", "valor"] },
  { key: "distributionDate", label: "Data de distribuição", required: false, aliases: ["data distribuicao", "data distribuição", "distribuicao", "distribuição"] },
  { key: "opposingParty", label: "Parte contrária", required: false, aliases: ["parte contraria", "parte contrária", "reu", "réu", "requerido"] },
  { key: "opposingPartyRole", label: "Papel da parte contrária", required: false, aliases: ["papel parte contraria", "polo", "tipo parte"] },
  { key: "notes", label: "Observações", required: false, aliases: ["observacoes", "observações", "notas", "obs"] },
] as const;

export function fieldsFor(kind: ImportKind): readonly ImportField[] {
  return kind === "clients" ? clientImportFields : processImportFields;
}

export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function suggestMapping(kind: ImportKind, headers: string[]): Record<string, string> {
  const normalizedHeaders = headers.map((header) => ({ original: header, normalized: normalizeHeader(header) }));
  const result: Record<string, string> = {};
  for (const field of fieldsFor(kind)) {
    const candidates = [field.label, field.key, ...field.aliases].map(normalizeHeader);
    const exact = normalizedHeaders.find((header) => candidates.includes(header.normalized));
    if (exact) {
      result[field.key] = exact.original;
      continue;
    }
    const fuzzy = normalizedHeaders.find((header) => candidates.some((candidate) => candidate.length >= 4 && (header.normalized.includes(candidate) || candidate.includes(header.normalized))));
    if (fuzzy) result[field.key] = fuzzy.original;
  }
  return result;
}

/** Valores separados por ponto e vírgula ou linha; vírgula pode fazer parte do assunto. */
export function parseImportedSubjects(raw: string): string[] {
  return [...new Set(raw.split(/[;\n]+/).map((item) => item.trim()).filter(Boolean))];
}

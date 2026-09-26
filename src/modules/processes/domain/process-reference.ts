export function formatInternalProcessCode(year: number, sequence: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error("PROCESS_REFERENCE_YEAR_INVALID");
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("PROCESS_REFERENCE_SEQUENCE_INVALID");
  return `${year}${String(sequence).padStart(4, "0")}`;
}

export function saoPauloYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo", year: "numeric",
  }).format(now));
}

export type ProcessDisplayParty = { name: string; role?: string | null };
export type ProcessDisplayClient = { name: string; partyRole?: string | null };

function normalized(value?: string | null) {
  return (value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Classificação apenas para escolher um nome na CAPA, nunca para inferir o polo processual no banco. */
function side(role?: string | null): "claimant" | "respondent" | null {
  const value = normalized(role);
  if (["autor", "autora", "requerente", "exequente", "reclamante", "apelante", "recorrente", "impetrante", "agravante"].includes(value)) return "claimant";
  if (["reu", "re", "requerido", "requerida", "executado", "executada", "reclamado", "reclamada", "apelado", "apelada", "recorrido", "recorrida", "impetrado", "impetrada", "agravado", "agravada"].includes(value)) return "respondent";
  return null;
}

/**
 * Nunca pega cegamente parties[0]: a importação pode conter o próprio cliente e litisconsortes.
 * Se os polos forem ambíguos e houver mais de um nome, não inventa qual é o adversário.
 */
export function selectOpposingPartyName(input: {
  representedClients: ProcessDisplayClient[];
  otherParties: ProcessDisplayParty[];
}): string | null {
  const represented = new Set(input.representedClients.map((client) => normalized(client.name)).filter(Boolean));
  const candidates = input.otherParties.filter((party) => normalized(party.name) && !represented.has(normalized(party.name)));
  if (!candidates.length) return null;
  // Escolha revisada pelo advogado prevalece sobre inferência de posição/polo da importação.
  const manual = candidates.find((party) => normalized(party.role) === "parte contraria");
  if (manual) return manual.name.trim();
  const primarySide = side(input.representedClients[0]?.partyRole);
  if (primarySide) {
    const matching = candidates.filter((party) => side(party.role) && side(party.role) !== primarySide);
    if (matching.length) return matching[0].name.trim();
    // Não apresentar um litisconsorte do mesmo polo como adversário.
    if (candidates.some((party) => side(party.role) === primarySide)) return null;
  }
  return candidates.length === 1 ? candidates[0].name.trim() : null;
}

export function buildProcessDisplayReference(input: {
  internalCode: string;
  primaryClientName?: string | null;
  opposingPartyName?: string | null;
}) {
  const primary = input.primaryClientName?.trim() || "Cliente não informado";
  const opposing = input.opposingPartyName?.trim() || "Parte contrária não cadastrada";
  return `${input.internalCode} - ${primary} X ${opposing}`;
}

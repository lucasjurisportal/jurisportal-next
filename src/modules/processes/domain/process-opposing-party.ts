/** Nome comercial da contraparte informado pelo advogado; não atribui polo processual oficial. */
export const MANUAL_OPPOSING_PARTY_ROLE = "Parte contrária";

type Party = { name: string; role: string; document: string };

function normalizedName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function isManualOpposingParty(party: Pick<Party, "role">) {
  return party.role.trim().toLowerCase() === MANUAL_OPPOSING_PARTY_ROLE.toLowerCase();
}

/** Preserva outras partes importadas ou cadastradas; adiciona/substitui só o marcador manual. */
export function withManualOpposingParty(parties: Party[], name: string): Party[] {
  const other = parties.filter((party) => !isManualOpposingParty(party));
  const trimmed = name.trim();
  if (!trimmed) return other;
  const previous = parties.find(isManualOpposingParty);
  return [...other, { name: trimmed, role: MANUAL_OPPOSING_PARTY_ROLE, document: previous?.document ?? "" }];
}

export function opposingPartyMatchesRepresentedClient(name: string, representedClientNames: string[]) {
  return Boolean(normalizedName(name)) && representedClientNames.some((candidate) => normalizedName(candidate) === normalizedName(name));
}

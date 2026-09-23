/** Dados sugeridos pelo DJeN, nunca confirmados sem conferência do escritório. */
export type ProcessPrefillSource = {
  processNumberNormalized: string | null;
  processNumberFormatted: string | null;
  court: string | null;
  judicialBody: string | null;
  parties: unknown;
};

export function buildPublicationProcessPrefill(
  publication: ProcessPrefillSource | null,
  currentUserId: string,
  memberUserIds: string[],
) {
  if (!publication || !/^\d{20}$/.test(publication.processNumberNormalized ?? "")) return undefined;
  const parties = Array.isArray(publication.parties)
    ? publication.parties.flatMap((party: unknown): Array<{ name: string; role: string; document: string }> => {
      if (!party || typeof party !== "object" || Array.isArray(party)) return [];
      const record = party as Record<string, unknown>;
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const role = typeof record.role === "string" ? record.role.trim() : "";
      if (name.length < 2 || name.length > 180 || role.length < 2 || role.length > 80) return [];
      return [{ name, role, document: "" }];
    }).slice(0, 30) : [];
  return {
    cnj: publication.processNumberFormatted || publication.processNumberNormalized!,
    // NUNCA atribuir automaticamente um cliente por ser o primeiro da lista.
    primaryClientId: "",
    additionalClientIds: [] as string[],
    responsibleUserId: memberUserIds.includes(currentUserId) ? currentUserId : "",
    court: (publication.court ?? "").slice(0, 120),
    division: (publication.judicialBody ?? "").slice(0, 120),
    district: "", processClass: "", subject: "", caseValue: "",
    distributionDate: "", notes: "", parties,
  };
}

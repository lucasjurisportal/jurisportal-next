/** Dados sugeridos pelo DJeN, nunca confirmados sem conferência do escritório. */
export type ProcessPrefillSource = {
  processNumberNormalized: string | null;
  processNumberFormatted: string | null;
  court: string | null;
  judicialBody: string | null;
  parties: unknown;
  processMetadata?: unknown;
  recipients?: Array<{ lawyerOab: { userId: string } }>;
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
  const metadata = publication.processMetadata && typeof publication.processMetadata === "object"
    && !Array.isArray(publication.processMetadata)
    ? publication.processMetadata as Record<string, unknown> : {};
  const suggested = (key: string, max: number) => typeof metadata[key] === "string"
    ? (metadata[key] as string).slice(0, max) : "";
  const eligibleLawyers = [...new Set((publication.recipients ?? [])
    .map((recipient) => recipient.lawyerOab.userId)
    .filter((id) => memberUserIds.includes(id)))];
  // Uma única OAB responsável pode sugerir seu titular; não escolher arbitrariamente
  // entre múltiplos destinatários e nunca confundir o proprietário com o titular.
  const suggestedResponsible = eligibleLawyers.length === 1 ? eligibleLawyers[0]
    : eligibleLawyers.length > 1 ? ""
    : memberUserIds.includes(currentUserId) ? currentUserId : "";
  return {
    cnj: publication.processNumberFormatted || publication.processNumberNormalized!,
    // NUNCA atribuir automaticamente um cliente por ser o primeiro da lista.
    primaryClientId: "",
    additionalClientIds: [] as string[],
    responsibleUserId: suggestedResponsible,
    court: (publication.court ?? "").slice(0, 120),
    division: (publication.judicialBody ?? "").slice(0, 120),
    district: suggested("district", 120), forum: suggested("forum", 160),
    processClass: suggested("processClass", 120), subject: suggested("subject", 300), caseValue: "",
    distributionDate: suggested("distributionDate", 10), notes: "", parties,
  };
}

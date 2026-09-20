export function formatInternalProcessCode(year: number, sequence: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error("PROCESS_REFERENCE_YEAR_INVALID");
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("PROCESS_REFERENCE_SEQUENCE_INVALID");
  return `${year}${String(sequence).padStart(4, "0")}`;
}

export function saoPauloYear(now = new Date()) {
  return Number(new Intl.DateTimeFormat("en", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
  }).format(now));
}

export function buildProcessDisplayReference(input: {
  internalCode: string;
  primaryClientName?: string | null;
  opposingPartyName?: string | null;
}) {
  const primary = input.primaryClientName?.trim();
  const opposing = input.opposingPartyName?.trim();
  if (primary && opposing) return `${input.internalCode} - ${primary} x ${opposing}`;
  if (primary) return `${input.internalCode} - ${primary}`;
  if (opposing) return `${input.internalCode} - ${opposing}`;
  return input.internalCode;
}

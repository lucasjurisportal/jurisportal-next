export function assertPublicationProcessCnjMatch(input: {
  publicationCnjNormalized?: string | null;
  processCnjNormalized: string;
}) {
  const publicationCnj = input.publicationCnjNormalized?.trim() ?? "";
  if (publicationCnj.length !== 20) return;
  if (publicationCnj !== input.processCnjNormalized) throw new Error("PUBLICATION_PROCESS_CNJ_MISMATCH");
}

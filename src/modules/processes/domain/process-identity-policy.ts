export function assertCnjMutationAllowed(input: {
  currentNormalized: string;
  requestedNormalized: string;
  allowMasterCorrection?: boolean;
  correctionReason?: string;
}) {
  const changed = input.currentNormalized !== input.requestedNormalized;
  if (!changed) return false;
  if (!input.allowMasterCorrection) throw new Error("PROCESS_CNJ_LOCKED");
  if ((input.correctionReason?.trim().length ?? 0) < 5) throw new Error("PROCESS_CNJ_CHANGE_REASON_REQUIRED");
  return true;
}

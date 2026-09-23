/**
 * Uma perda de PDF nunca pode ser transformada silenciosamente em backup confirmado.
 * O reconhecimento manual existe apenas para registros de teste excluídos no staging;
 * mantém metadados, quota e auditoria, e não apaga objetos nem libera exclusão definitiva.
 */
export const ACKNOWLEDGED_MISSING = "ACKNOWLEDGED_MISSING";

export function isStagingMissingAcknowledgementAllowed(input: {
  sourceBucket?: string; backupBucket?: string; backupPrefix?: string;
}) {
  return input.sourceBucket === "jurisportal-staging"
    && input.backupBucket === "jurisportal-backup"
    && input.backupPrefix === "staging";
}

export function canAcknowledgeDeletedMissing(input: {
  status: string; backupStatus: string; backupLastError: string | null;
}) {
  return input.status === "DELETED"
    && input.backupStatus === "FAILED"
    && input.backupLastError === "SOURCE_PDF_MISSING";
}

/** Escopo obrigatório de toda mutação de registro de processo. */
export function scopedRecordWhere(recordId: string, organizationId: string) {
  if (!recordId?.trim() || !organizationId?.trim()) throw new Error("TENANT_SCOPE_REQUIRED");
  return { id: recordId, organizationId } as const;
}

export function scopedProcessWhere(processId: string, organizationId: string) {
  return scopedRecordWhere(processId, organizationId);
}

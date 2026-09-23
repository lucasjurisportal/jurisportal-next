/** Escopo obrigatório de toda mutação de registro de processo. */
export function scopedProcessWhere(processId: string, organizationId: string) {
  if (!processId || !organizationId) throw new Error("TENANT_SCOPE_REQUIRED");
  return { id: processId, organizationId } as const;
}

/** Telefone de contato, não constitui aceite para mensagens automatizadas. */
export function normalizeTeamMobile(value: string) {
  return value.replace(/\D/g, "");
}

export function isValidTeamMobile(value: string) {
  if (!value.trim()) return true;
  return /^(?:55)?[1-9]\d9\d{8}$/.test(normalizeTeamMobile(value));
}

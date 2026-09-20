export type Oab = {
  rawNumber: string;
  normalizedNumber: string;
  uf: string;
};

const BRAZILIAN_UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

/**
 * OAB não é tratada como inteiro porque pode possuir zeros à esquerda e complementos alfanuméricos.
 */
export function normalizeOabNumber(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function normalizeOabUf(value: string): string {
  const uf = value.trim().toUpperCase();
  if (!BRAZILIAN_UFS.has(uf)) {
    throw new Error("UF de OAB inválida.");
  }
  return uf;
}

export function createOab(number: string, uf: string): Oab {
  const normalizedNumber = normalizeOabNumber(number);
  if (!normalizedNumber) {
    throw new Error("Número de OAB é obrigatório.");
  }

  return {
    rawNumber: number,
    normalizedNumber,
    uf: normalizeOabUf(uf),
  };
}

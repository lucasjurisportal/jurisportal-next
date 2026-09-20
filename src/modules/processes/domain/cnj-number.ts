export type CnjNumber = {
  raw: string;
  digits: string;
  formatted: string;
};

const CNJ_DIGIT_COUNT = 20;

/**
 * Remove qualquer caractere que não seja número.
 * Não altera a fonte original; o valor `raw` deve ser preservado no banco quando necessário.
 */
export function normalizeCnjDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Validação estrutural inicial do padrão CNJ.
 * Nesta etapa conferimos os 20 dígitos e a divisão do número.
 * A validação matemática do dígito verificador será adicionada e testada separadamente.
 */
export function isStructurallyValidCnj(value: string): boolean {
  return normalizeCnjDigits(value).length === CNJ_DIGIT_COUNT;
}

export function formatCnjNumber(value: string): string {
  const digits = normalizeCnjDigits(value);
  if (digits.length !== CNJ_DIGIT_COUNT) {
    throw new Error("Número CNJ deve possuir 20 dígitos.");
  }

  return `${digits.slice(0, 7)}-${digits.slice(7, 9)}.${digits.slice(9, 13)}.${digits.slice(13, 14)}.${digits.slice(14, 16)}.${digits.slice(16, 20)}`;
}

export function parseCnjNumber(value: string): CnjNumber {
  const digits = normalizeCnjDigits(value);
  if (digits.length !== CNJ_DIGIT_COUNT) {
    throw new Error("Número CNJ inválido: esperado formato com 20 dígitos.");
  }

  return {
    raw: value,
    digits,
    formatted: formatCnjNumber(digits),
  };
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

function allDigitsEqual(value: string): boolean {
  return /^(\d)\1+$/.test(value);
}

export function isValidCpf(value: string): boolean {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11 || allDigitsEqual(cpf)) return false;

  const calculateDigit = (length: number): number => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

export function isValidCnpj(value: string): boolean {
  const cnpj = digitsOnly(value);
  if (cnpj.length !== 14 || allDigitsEqual(cnpj)) return false;

  const calculateDigit = (baseLength: 12 | 13): number => {
    const weights = baseLength === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

export function formatCpf(value: string): string {
  const digits = digitsOnly(value).slice(0, 11);
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatCnpj(value: string): string {
  const digits = digitsOnly(value).slice(0, 14);
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

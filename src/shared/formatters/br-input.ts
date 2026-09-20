function onlyDigits(value: string, max: number): string {
  return value.replace(/\D/g, "").slice(0, max);
}

export function formatCpfInput(value: string): string {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export function formatCnpjInput(value: string): string {
  const digits = onlyDigits(value, 14);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

export function formatTaxIdInput(value: string, kind: "PF" | "PJ"): string {
  return kind === "PF" ? formatCpfInput(value) : formatCnpjInput(value);
}

export function formatPhoneInput(value: string): string {
  const digits = onlyDigits(value, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const area = digits.slice(0, 2);
  const local = digits.slice(2);
  if (local.length <= 4) return `(${area}) ${local}`;

  if (digits.length <= 10) {
    return `(${area}) ${local.slice(0, 4)}-${local.slice(4, 8)}`;
  }

  return `(${area}) ${local.slice(0, 5)}-${local.slice(5, 9)}`;
}

export function formatCepInput(value: string): string {
  const digits = onlyDigits(value, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

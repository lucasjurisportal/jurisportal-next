import { createHash, randomBytes } from "node:crypto";

/** 96 bits criptograficamente aleatórios: cupom não sequencial e não enumerável. */
export function issueMigrationCode(): string {
  const hex = randomBytes(12).toString("hex").toUpperCase();
  return `JPM-${hex.match(/.{4}/g)?.join("-")}`;
}

export function normalizedPromotionCode(input: string): string | null {
  const normalized = input.trim().toUpperCase();
  return /^JPM(?:-[A-F0-9]{4}){6}$/.test(normalized) ? normalized : null;
}

export function promotionCodeHash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

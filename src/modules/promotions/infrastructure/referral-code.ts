import { randomBytes } from "node:crypto";

/** Código público de convite: aleatório, único e estável, não substitui autenticação. */
export function issueReferralCode(): string {
  const pieces = randomBytes(12).toString("hex").toUpperCase().match(/.{4}/g);
  if (!pieces) throw new Error("REFERRAL_CODE_GENERATION_FAILED");
  return `JPI-${pieces.join("-")}`;
}

export function normalizedReferralCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return /^JPI(?:-[A-F0-9]{4}){6}$/.test(code) ? code : null;
}

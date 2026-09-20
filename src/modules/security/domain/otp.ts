import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import {
  OTP_ALPHABET,
  OTP_CODE_LENGTH,
  type SecurityChallengePurpose,
} from "./security-policy";

function securitySecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET não configurada.");
  return secret;
}

export function generateOtpCode(): string {
  let code = "";
  for (let index = 0; index < OTP_CODE_LENGTH; index += 1) {
    code += OTP_ALPHABET[randomInt(0, OTP_ALPHABET.length)];
  }
  return code;
}

export function normalizeOtpCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, OTP_CODE_LENGTH);
}

export function hashOtpCode(
  challengeId: string,
  purpose: SecurityChallengePurpose,
  code: string,
): string {
  return createHmac("sha256", securitySecret())
    .update(`${challengeId}:${purpose}:${normalizeOtpCode(code)}`)
    .digest("hex");
}

export function otpMatches(expectedHash: string, actualHash: string): boolean {
  const expected = Buffer.from(expectedHash, "hex");
  const actual = Buffer.from(actualHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

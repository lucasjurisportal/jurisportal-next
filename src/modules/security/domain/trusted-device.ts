import { createHash, randomBytes } from "node:crypto";
import { TRUSTED_DEVICE_DAYS } from "./security-policy";

export function createTrustedDeviceToken() {
  const rawToken = randomBytes(32).toString("base64url");
  return {
    rawToken,
    tokenHash: hashTrustedDeviceToken(rawToken),
    expiresAt: new Date(Date.now() + TRUSTED_DEVICE_DAYS * 24 * 60 * 60 * 1000),
  };
}

export function hashTrustedDeviceToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function hashUserAgent(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;
  return createHash("sha256").update(userAgent).digest("hex");
}

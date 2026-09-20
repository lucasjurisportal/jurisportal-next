import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function encryptionKey() {
  const raw = process.env.GOOGLE_CALENDAR_TOKEN_KEY?.trim();
  if (!raw) throw new Error("GOOGLE_CALENDAR_TOKEN_KEY_MISSING");
  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptIntegrationSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function decryptIntegrationSecret(payload: string) {
  const [version, ivText, tagText, encryptedText] = payload.split(".");
  if (version !== VERSION || !ivText || !tagText || !encryptedText) throw new Error("INVALID_ENCRYPTED_SECRET");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]);
  return decrypted.toString("utf8");
}

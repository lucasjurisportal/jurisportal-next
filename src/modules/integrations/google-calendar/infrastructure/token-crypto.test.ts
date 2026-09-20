import test from "node:test";
import assert from "node:assert/strict";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./token-crypto";

test("token do Google é cifrado e pode ser decifrado com a mesma chave", () => {
  const previous = process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  process.env.GOOGLE_CALENDAR_TOKEN_KEY = "calendar-test-key";
  try {
    const original = "refresh-token-example";
    const encrypted = encryptIntegrationSecret(original);
    assert.notEqual(encrypted, original);
    assert.equal(decryptIntegrationSecret(encrypted), original);
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_CALENDAR_TOKEN_KEY;
    else process.env.GOOGLE_CALENDAR_TOKEN_KEY = previous;
  }
});

test("payload cifrado adulterado é rejeitado", () => {
  const previous = process.env.GOOGLE_CALENDAR_TOKEN_KEY;
  process.env.GOOGLE_CALENDAR_TOKEN_KEY = "calendar-test-key";
  try {
    const encrypted = encryptIntegrationSecret("secret");
    const parts = encrypted.split(".");
    parts[3] = `${parts[3].slice(0, -1)}${parts[3].endsWith("A") ? "B" : "A"}`;
    assert.throws(() => decryptIntegrationSecret(parts.join(".")));
  } finally {
    if (previous === undefined) delete process.env.GOOGLE_CALENDAR_TOKEN_KEY;
    else process.env.GOOGLE_CALENDAR_TOKEN_KEY = previous;
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { publicationEmailSetup } from "./publication-email-config";
const valid = { RESEND_API_KEY: "re_12345678901234567890", RESEND_FROM: "Jurisportal <alertas@jurisportal.com.br>", NEXT_PUBLIC_APP_URL: "http://localhost:3000" };
test("remetente e chave reais configurados não ligam envio por conta própria", () => {
  const result = publicationEmailSetup(valid);
  assert.equal(result.configured, true);
  assert.equal(result.enabled, false);
});
test("placeholder e ausência de URL de origem não contam como configuração", () => {
  const result = publicationEmailSetup({ RESEND_API_KEY: "", RESEND_FROM: "Jurisportal <alertas@seu-dominio-verificado.com.br>" });
  assert.deepEqual(result.issues, ["KEY_MISSING", "FROM_PLACEHOLDER", "APP_URL_INVALID"]);
});
test("chave e remetente ausentes impedem status pronto", () => {
  assert.equal(publicationEmailSetup({ PUBLICATION_EMAIL_ENABLED: "true" }).configured, false);
});
test("URL com credenciais ou HTTP externo é inválida", () => {
  assert.equal(publicationEmailSetup({ ...valid, NEXT_PUBLIC_APP_URL: "http://jurisportal.com.br" }).configured, false);
  assert.equal(publicationEmailSetup({ ...valid, NEXT_PUBLIC_APP_URL: "https://alice:secret@jurisportal.com.br" }).configured, false);
});

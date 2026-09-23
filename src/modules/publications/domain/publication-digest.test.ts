import test from "node:test";
import assert from "node:assert/strict";
import { renderPublicationDigest, safePublicAppUrl } from "./publication-digest";

test("e-mail consolidado deduplica publicação que chega por duas OABs", () => {
  const item = { publicationId: "abc", kind: "INTIMATION", communicationType: "Intimação", cnj: "123", court: "TJSP", summary: "Manifestação sobre documentos", sourceUrl: null };
  const result = renderPublicationDigest({ name: "Ana", items: [item, item] });
  assert.equal(result.communicationCount, 1);
  assert.equal(result.text.match(/Processo: 123/g)?.length, 1);
});
test("conteúdo externo é escapado em HTML", () => {
  const result = renderPublicationDigest({ name: "<Ana>", items: [{ publicationId: "a", kind: "PUBLICATION", communicationType: "<script>", cnj: null, court: null, summary: "<img src=x>", sourceUrl: null }] });
  assert.ok(!result.html.includes("<script>"));
  assert.ok(result.html.includes("&lt;img src=x&gt;"));
});
test("links de aplicação só usam origem aceitável", () => {
  assert.equal(safePublicAppUrl("https://jurisportal.com.br/abc"), "https://jurisportal.com.br");
  assert.equal(safePublicAppUrl("http://site-externo.com/"), null);
});

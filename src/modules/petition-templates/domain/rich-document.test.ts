import test from "node:test";
import assert from "node:assert/strict";
import { encodeRichDocument, decodeRichDocument, richToPlain, replaceRichVariables } from "./rich-document";

test("formatação sobrevive a salvar, gerar e recuperar texto", () => {
  const original = encodeRichDocument({ version: 1, blocks: [
    { type: "heading", align: "center", runs: [{ text: "PETIÇÃO", bold: true }] },
    { type: "paragraph", align: "justify", runs: [{ text: "Cliente: " }, { text: "{{CLIENTE_NOME}}", italic: true }] },
  ] });
  const rendered = decodeRichDocument(replaceRichVariables(original, { "{{CLIENTE_NOME}}": 'João "da Silva"' }));
  assert.equal(rendered.blocks[0].align, "center");
  assert.equal(rendered.blocks[1].runs[1].text, 'João "da Silva"');
  assert.equal(rendered.blocks[1].runs[1].italic, true);
  assert.equal(richToPlain(rendered), 'PETIÇÃO\nCliente: João "da Silva"');
});

test("rejeita estrutura inválida ou texto acima do limite", () => {
  assert.throws(() => decodeRichDocument('JP_RICH_V1:{"version":1,"blocks":[{"type":"script","align":"left","runs":[]}]}'), /INVALID_RICH_DOCUMENT/);
  assert.throws(() => decodeRichDocument('JP_RICH_V1:{"version":1,"blocks":[{"type":"paragraph","align":"left","runs":[{"text":"ok","bold":"sim"}]}]}'), /INVALID_RICH_DOCUMENT/);
  assert.throws(() => decodeRichDocument('JP_RICH_V1:not-json'), /INVALID_RICH_DOCUMENT/);
});

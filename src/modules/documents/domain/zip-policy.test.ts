import assert from "node:assert/strict";
import test from "node:test";
import { zipSync } from "fflate";
import { inspectZipArchive, ZipPolicyError } from "./zip-policy";

const pdf = new TextEncoder().encode("%PDF-1.4\n1 0 obj <<>> endobj\n%%EOF");
const archive = (names: Record<string, Uint8Array>) => zipSync(names);

test("ZIP válido contém apenas PDFs", () => {
  const list = inspectZipArchive(archive({ "peticao.pdf": pdf, "pasta/procuracao.pdf": pdf }));
  assert.deepEqual(list.map((item) => item.name), ["peticao.pdf", "pasta/procuracao.pdf"]);
});

test("ZIP bloqueia traversal mesmo terminando em .pdf", () => {
  assert.throws(() => inspectZipArchive(archive({ "../segredo.pdf": pdf })), ZipPolicyError);
});

test("ZIP recusa conteúdo fora de PDF antes de extrair", () => {
  assert.throws(() => inspectZipArchive(archive({ "contrato.pdf": pdf, "executavel.exe": pdf })), ZipPolicyError);
});

test("ZIP recusa mais de 200 documentos", () => {
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < 201; i++) files[`doc-${i}.pdf`] = pdf;
  assert.throws(() => inspectZipArchive(archive(files)), ZipPolicyError);
});

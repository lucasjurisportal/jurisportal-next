import { inflateRawSync } from "node:zlib";

const MAX_TXT_BYTES = 1 * 1024 * 1024;
const MAX_DOCX_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_XML_BYTES = 8 * 1024 * 1024;

export type ImportedTemplateKind = "DOCX" | "TXT";

export type ImportedTemplateText = {
  kind: ImportedTemplateKind;
  fileName: string;
  content: string;
  warnings: string[];
};

function normalizeText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)));
}

function readUInt32LE(buffer: Buffer, offset: number) {
  if (offset < 0 || offset + 4 > buffer.length) throw new Error("DOCX_INVALID_ZIP");
  return buffer.readUInt32LE(offset);
}

function extractZipEntry(buffer: Buffer, targetName: string): Buffer {
  // Parse the ZIP central directory instead of trusting local-file traversal.
  const eocdSignature = 0x06054b50;
  let eocdOffset = -1;
  const minOffset = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minOffset; offset -= 1) {
    if (readUInt32LE(buffer, offset) === eocdSignature) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0) throw new Error("DOCX_INVALID_ZIP");

  const centralDirectorySize = readUInt32LE(buffer, eocdOffset + 12);
  const centralDirectoryOffset = readUInt32LE(buffer, eocdOffset + 16);
  if (centralDirectoryOffset + centralDirectorySize > buffer.length) throw new Error("DOCX_INVALID_ZIP");

  let offset = centralDirectoryOffset;
  const centralEnd = centralDirectoryOffset + centralDirectorySize;
  while (offset + 46 <= centralEnd) {
    if (readUInt32LE(buffer, offset) !== 0x02014b50) throw new Error("DOCX_INVALID_ZIP");
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = readUInt32LE(buffer, offset + 20);
    const uncompressedSize = readUInt32LE(buffer, offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = readUInt32LE(buffer, offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + nameLength;
    if (nameEnd > buffer.length) throw new Error("DOCX_INVALID_ZIP");
    const name = buffer.toString("utf8", nameStart, nameEnd);

    if (name === targetName) {
      if (uncompressedSize > MAX_DOCUMENT_XML_BYTES) throw new Error("DOCX_CONTENT_TOO_LARGE");
      if (localHeaderOffset + 30 > buffer.length || readUInt32LE(buffer, localHeaderOffset) !== 0x04034b50) {
        throw new Error("DOCX_INVALID_ZIP");
      }
      const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > buffer.length) throw new Error("DOCX_INVALID_ZIP");
      const compressed = buffer.subarray(dataStart, dataEnd);
      let output: Buffer;
      if (compressionMethod === 0) output = Buffer.from(compressed);
      else if (compressionMethod === 8) output = inflateRawSync(compressed, { maxOutputLength: MAX_DOCUMENT_XML_BYTES });
      else throw new Error("DOCX_UNSUPPORTED_COMPRESSION");
      if (output.length > MAX_DOCUMENT_XML_BYTES) throw new Error("DOCX_CONTENT_TOO_LARGE");
      return output;
    }

    offset = nameEnd + extraLength + commentLength;
  }
  throw new Error("DOCX_DOCUMENT_XML_NOT_FOUND");
}

function docxXmlToEditableText(xml: string) {
  // Preserve semantic text structure we can safely edit. Complex Word layout is intentionally not reproduced.
  const structured = xml
    .replace(/<w:tab\b[^>]*\/>/g, "\t")
    .replace(/<w:br\b[^>]*\/>/g, "\n")
    .replace(/<w:cr\b[^>]*\/>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<\/w:tr>/g, "\n")
    .replace(/<\/w:tc>/g, "\t");
  const textRuns = structured.replace(/<[^>]+>/g, "");
  return normalizeText(decodeXmlEntities(textRuns));
}

function extensionOf(fileName: string) {
  const dot = fileName.lastIndexOf(".");
  return dot >= 0 ? fileName.slice(dot).toLowerCase() : "";
}

export function importTemplateText(input: { fileName: string; bytes: Buffer }): ImportedTemplateText {
  const fileName = input.fileName.trim();
  const extension = extensionOf(fileName);
  if (extension === ".txt") {
    if (input.bytes.length > MAX_TXT_BYTES) throw new Error("TXT_TOO_LARGE");
    const content = normalizeText(new TextDecoder("utf-8", { fatal: false }).decode(input.bytes));
    if (!content) throw new Error("IMPORTED_TEMPLATE_EMPTY");
    return { kind: "TXT", fileName, content, warnings: [] };
  }

  if (extension === ".docx") {
    if (input.bytes.length > MAX_DOCX_BYTES) throw new Error("DOCX_TOO_LARGE");
    if (input.bytes.length < 4 || input.bytes[0] !== 0x50 || input.bytes[1] !== 0x4b) throw new Error("DOCX_INVALID_ZIP");
    const documentXml = extractZipEntry(input.bytes, "word/document.xml").toString("utf8");
    const content = docxXmlToEditableText(documentXml);
    if (!content) throw new Error("IMPORTED_TEMPLATE_EMPTY");
    return {
      kind: "DOCX",
      fileName,
      content,
      warnings: ["A importação prioriza o texto editável. Cabeçalhos, rodapés, imagens, tabelas complexas e estilos avançados do Word podem não ser preservados."],
    };
  }

  throw new Error("UNSUPPORTED_TEMPLATE_FILE");
}

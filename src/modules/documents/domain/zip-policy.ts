/** Política de entrada de ZIP, compartilhada pela interface e pelos testes. */
export const ZIP_MAX_COMPRESSED_BYTES = 100 * 1024 * 1024;
export const ZIP_MAX_EXPANDED_BYTES = 500 * 1024 * 1024;
export const ZIP_MAX_PDFS = 200;
export const ZIP_MAX_SINGLE_PDF_BYTES = 50 * 1024 * 1024;
export const ZIP_DOWNLOAD_MAX_BYTES = 200 * 1024 * 1024;

export class ZipPolicyError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}

type CentralEntry = { name: string; compressed: number; uncompressed: number; method: number };

/** Examina o diretório central ANTES de extrair; não confia nas extensões nem na declaração do usuário. */
export function inspectZipArchive(bytes: Uint8Array): CentralEntry[] {
  if (!bytes.byteLength || bytes.byteLength > ZIP_MAX_COMPRESSED_BYTES) {
    throw new ZipPolicyError("ZIP_COMPRESSED_LIMIT", "O ZIP deve ter até 100 MB.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // O registro EOCD pode ter comentário de até 65535 bytes.
  const start = Math.max(0, bytes.byteLength - 22 - 65_535);
  let eocd = -1;
  for (let pos = bytes.byteLength - 22; pos >= start; pos--) {
    if (view.getUint32(pos, true) === 0x06054b50 && pos + 22 + view.getUint16(pos + 20, true) === bytes.byteLength) {
      eocd = pos; break;
    }
  }
  if (eocd < 0) throw new ZipPolicyError("ZIP_INVALID", "Não foi possível identificar um arquivo ZIP válido.");
  const entries = view.getUint16(eocd + 10, true);
  const diskEntries = view.getUint16(eocd + 8, true);
  const disk = view.getUint16(eocd + 4, true);
  const centralDisk = view.getUint16(eocd + 6, true);
  const centralSize = view.getUint32(eocd + 12, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (disk || centralDisk || diskEntries !== entries || entries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) {
    throw new ZipPolicyError("ZIP_UNSUPPORTED", "ZIP dividido em partes ou ZIP64 não é aceito nesta versão.");
  }
  if (entries > ZIP_MAX_PDFS + 50 || !entries || centralOffset + centralSize > eocd) {
    throw new ZipPolicyError("ZIP_ITEMS_LIMIT", "O ZIP deve conter de 1 a 200 arquivos PDF.");
  }
  const result: CentralEntry[] = [];
  const seen = new Set<string>();
  const decode = new TextDecoder("utf-8", { fatal: false });
  let offset = centralOffset;
  let expanded = 0;
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > eocd || view.getUint32(offset, true) !== 0x02014b50) {
      throw new ZipPolicyError("ZIP_INVALID", "A estrutura interna do ZIP está danificada.");
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressed = view.getUint32(offset + 20, true);
    const uncompressed = view.getUint32(offset + 24, true);
    const nameLen = view.getUint16(offset + 28, true);
    const extraLen = view.getUint16(offset + 30, true);
    const commentLen = view.getUint16(offset + 32, true);
    const diskStart = view.getUint16(offset + 34, true);
    const externalAttrs = view.getUint32(offset + 38, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const end = offset + 46 + nameLen + extraLen + commentLen;
    if (end > eocd || localHeaderOffset >= centralOffset || compressed === 0xffffffff || uncompressed === 0xffffffff || diskStart !== 0) {
      throw new ZipPolicyError("ZIP_INVALID", "O ZIP contém um registro incompatível ou danificado.");
    }
    const name = decode.decode(bytes.subarray(offset + 46, offset + 46 + nameLen));
    offset = end;
    if (name.endsWith("/")) continue; // Pastas do ZIP são permitidas; não viram documentos.
    const parts = name.replace(/\\/g, "/").split("/");
    const leaf = parts[parts.length - 1];
    if (!leaf || parts.some((part) => !part || part === "." || part === ".." || part.includes("\0") || part.includes(":")) ||
        name.startsWith("/") || /[\x00-\x1f\x7f]/.test(name) || !leaf.toLowerCase().endsWith(".pdf")) {
      throw new ZipPolicyError("ZIP_INVALID_ENTRY", "O ZIP deve conter apenas PDFs com nomes e caminhos seguros.");
    }
    const key = name.toLocaleLowerCase("en-US");
    if (seen.has(key)) throw new ZipPolicyError("ZIP_DUPLICATE_ENTRY", "O ZIP contém arquivos duplicados com o mesmo caminho.");
    seen.add(key);
    const unixType = (externalAttrs >>> 16) & 0xf000;
    if (unixType === 0xa000 || (flags & 1) !== 0 || (method !== 0 && method !== 8) || !compressed || !uncompressed) {
      throw new ZipPolicyError("ZIP_UNSUPPORTED", "ZIP com arquivos protegidos, atalhos ou compactação incompatível não é aceito.");
    }
    if (uncompressed > ZIP_MAX_SINGLE_PDF_BYTES || uncompressed / compressed > 200) {
      throw new ZipPolicyError("ZIP_PDF_LIMIT", "O ZIP contém PDF maior que 50 MB ou compactação suspeita.");
    }
    expanded += uncompressed;
    if (expanded > ZIP_MAX_EXPANDED_BYTES || result.length >= ZIP_MAX_PDFS) {
      throw new ZipPolicyError("ZIP_EXPANDED_LIMIT", "O ZIP excede 500 MB descompactados ou 200 PDFs.");
    }
    result.push({ name, compressed, uncompressed, method });
  }
  if (offset !== centralOffset + centralSize || !result.length) {
    throw new ZipPolicyError("ZIP_INVALID", "O ZIP está vazio ou possui estrutura inconsistente.");
  }
  return result;
}

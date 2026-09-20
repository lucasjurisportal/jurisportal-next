const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN_X = 56.7; // ~20 mm
const MARGIN_TOP = 56.7;
const MARGIN_BOTTOM = 56.7;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const MAX_WIDTH = A4_WIDTH - (MARGIN_X * 2);

function toWinAnsi(value: string) {
  // Helvetica built into PDF readers uses WinAnsi. Replace only characters outside that practical legal-text subset.
  return value
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\u0009\u000A\u000D\u0020-\u007E\u00A0-\u00FF]/g, "?");
}

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function estimatedTextWidth(text: string) {
  // Conservative width approximation for Helvetica 11pt, enough for deterministic wrapping without a font engine.
  return Array.from(text).reduce((sum, char) => sum + (char === " " ? 2.8 : /[ilI.,:;!'|]/.test(char) ? 2.7 : /[mwMW@%]/.test(char) ? 8.4 : 5.8), 0);
}

function wrapParagraph(paragraph: string) {
  if (!paragraph.trim()) return [""];
  const words = paragraph.replace(/\t/g, "    ").split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || estimatedTextWidth(candidate) <= MAX_WIDTH) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function buildPages(content: string) {
  const lines = toWinAnsi(content).replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").flatMap(wrapParagraph);
  const maxLines = Math.floor((A4_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM) / LINE_HEIGHT);
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += maxLines) pages.push(lines.slice(i, i + maxLines));
  return pages.length ? pages : [[""]];
}

export function createPetitionPdf(content: string): Buffer {
  const pages = buildPages(content);
  const objects: string[] = [];
  const addObject = (body: string) => { objects.push(body); return objects.length; };

  const catalogId = addObject("");
  const pagesId = addObject("");
  const fontId = addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const pageIds: number[] = [];

  for (const pageLines of pages) {
    const commands = ["BT", `/F1 ${FONT_SIZE} Tf`, `${LINE_HEIGHT} TL`, `${MARGIN_X.toFixed(2)} ${(A4_HEIGHT - MARGIN_TOP).toFixed(2)} Td`];
    pageLines.forEach((line, index) => {
      if (index > 0) commands.push("T*");
      commands.push(`(${pdfEscape(line)}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4_WIDTH.toFixed(2)} ${A4_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i += 1) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

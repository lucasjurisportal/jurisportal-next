import { decodeRichDocument, type RichAlign, type RichBlock, type RichRun } from "../domain/rich-document";

const PAGE_WIDTH = 595.28; // A4, em pontos PDF
const PAGE_HEIGHT = 841.89;
const LEFT = 56.7;
const TOP = 56.7;
const BOTTOM = 56.7;
const WIDTH = PAGE_WIDTH - 2 * LEFT;

type Segment = RichRun & { width: number };
type PrintLine = { runs: Segment[]; width: number; align: RichAlign; fontSize: number; advance: number; isLast: boolean };

function winAnsi(value: string) {
  return value.replace(/[“”]/g, '"').replace(/[‘’]/g, "'")
    .replace(/[–—]/g, "-").replace(/…/g, "...")
    .replace(/[^\u0020-\u007e\u00a0-\u00ff]/g, "?");
}
function escapePdf(value: string) { return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)"); }
function widthOf(text: string, fontSize: number, bold: boolean) {
  const multiplier = fontSize / 11;
  return [...text].reduce((sum, char) => sum + (char === " " ? 2.8 : /[ilI.,:;!'|]/.test(char) ? 2.7 : /[mwMW@%]/.test(char) ? 8.4 : 5.8), 0) * multiplier * (bold ? 1.04 : 1);
}
function fontId(run: RichRun, heading: boolean) {
  const bold = heading || run.bold;
  return bold ? (run.italic ? "F4" : "F2") : (run.italic ? "F3" : "F1");
}

function paragraphLines(block: RichBlock): PrintLine[] {
  const fontSize = block.type === "heading" ? 14 : 11;
  const advance = block.type === "heading" ? 21 : 16;
  const lines: PrintLine[] = [];
  let runs: Segment[] = [];
  let lineWidth = 0;
  const flush = () => {
    lines.push({ runs, width: lineWidth, align: block.align, fontSize, advance, isLast: false });
    runs = []; lineWidth = 0;
  };
  const append = (text: string, style: RichRun) => {
    if (!text) return;
    const value = winAnsi(text);
    const bold = block.type === "heading" || !!style.bold;
    const width = widthOf(value, fontSize, bold);
    const previous = runs[runs.length - 1];
    if (previous && previous.bold === style.bold && previous.italic === style.italic && previous.underline === style.underline) {
      previous.text += value; previous.width += width;
    } else runs.push({ text: value, bold: style.bold, italic: style.italic, underline: style.underline, width });
    lineWidth += width;
  };
  for (const run of block.runs) {
    const normalized = run.text.replace(/\t/g, "    ").replace(/\r\n?/g, "\n");
    for (const token of normalized.match(/\S+|\s+/g) ?? []) {
      if (token.includes("\n")) {
        for (const [i, part] of token.split("\n").entries()) {
          if (i) flush();
          if (part && runs.length) append(part, run);
        }
        continue;
      }
      if (!runs.length && !token.trim()) continue;
      const length = widthOf(winAnsi(token), fontSize, block.type === "heading" || !!run.bold);
      if (lineWidth && lineWidth + length > WIDTH) {
        flush();
        if (!token.trim()) continue;
      }
      if (length > WIDTH) {
        for (const char of token) {
          const charWidth = widthOf(winAnsi(char), fontSize, block.type === "heading" || !!run.bold);
          if (lineWidth && lineWidth + charWidth > WIDTH) flush();
          append(char, run);
        }
      } else append(token, run);
    }
  }
  flush();
  lines[lines.length - 1].advance += block.type === "heading" ? 9 : 3;
  lines[lines.length - 1].isLast = true;
  return lines;
}

function pageLayout(content: string) {
  const document = decodeRichDocument(content);
  const pages: PrintLine[][] = [[]];
  let y = PAGE_HEIGHT - TOP;
  for (const block of document.blocks) {
    const lines = paragraphLines(block);
    for (const line of lines) {
      if (y - line.advance < BOTTOM) {
        pages.push([]); y = PAGE_HEIGHT - TOP;
      }
      pages[pages.length - 1].push(line);
      y -= line.advance;
    }
  }
  return pages;
}

/** PDF multipágina A4; suporta negrito, itálico, sublinhado, títulos e alinhamento. */
export function createPetitionPdf(content: string): Buffer {
  const pages = pageLayout(content);
  const objects: string[] = [];
  const add = (body: string) => { objects.push(body); return objects.length; };
  const catalog = add(""); const pagesObject = add("");
  const fonts = ["Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique"]
    .map((base) => add(`<< /Type /Font /Subtype /Type1 /BaseFont /${base} /Encoding /WinAnsiEncoding >>`));
  const pageIds: number[] = [];

  for (const page of pages) {
    let y = PAGE_HEIGHT - TOP;
    const commands: string[] = [];
    for (const line of page) {
      let x = LEFT;
      if (line.align === "center") x += Math.max(0, (WIDTH - line.width) / 2);
      if (line.align === "right") x += Math.max(0, WIDTH - line.width);
      const spaces = line.runs.reduce((n, run) => n + [...run.text].filter((ch) => ch === " ").length, 0);
      const extra = line.align === "justify" && !line.isLast && spaces > 0 ? Math.max(0, (WIDTH - line.width) / spaces) : 0;
      for (const run of line.runs) {
        const font = fontId(run, line.fontSize === 14);
        const value = escapePdf(run.text);
        commands.push(`BT /${font} ${line.fontSize} Tf ${extra.toFixed(2)} Tw 1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm (${value}) Tj ET`);
        const finalWidth = run.width + extra * [...run.text].filter((ch) => ch === " ").length;
        if (run.underline && run.text.trim()) commands.push(`${x.toFixed(2)} ${(y - 2).toFixed(2)} m ${(x + finalWidth).toFixed(2)} ${(y - 2).toFixed(2)} l S`);
        x += finalWidth;
      }
      y -= line.advance;
    }
    const stream = commands.join("\n");
    const streamId = add(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    const refs = fonts.map((id, index) => `/F${index + 1} ${id} 0 R`).join(" ");
    const pageId = add(`<< /Type /Page /Parent ${pagesObject} 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << ${refs} >> >> /Contents ${streamId} 0 R >>`);
    pageIds.push(pageId);
  }
  objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObject} 0 R >>`;
  objects[pagesObject - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let pdf = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets = [0];
  for (const [index, body] of objects.entries()) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

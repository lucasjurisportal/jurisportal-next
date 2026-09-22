/** Formato interno, intencionalmente sem HTML: nenhum script/estilo chega ao banco ou PDF. */
export const RICH_DOCUMENT_PREFIX = "JP_RICH_V1:";
export type RichAlign = "left" | "center" | "right" | "justify";
export type RichRun = { text: string; bold?: boolean; italic?: boolean; underline?: boolean };
export type RichBlock = { type: "paragraph" | "heading"; align: RichAlign; runs: RichRun[] };
export type RichDocument = { version: 1; blocks: RichBlock[] };
const aligns = new Set(["left", "center", "right", "justify"]);

export function plainToRich(content: string): RichDocument {
  return { version: 1, blocks: content.replace(/\r\n?/g, "\n").split("\n").map((line) => ({
    type: "paragraph", align: "left", runs: [{ text: line }],
  })) };
}

export function richToPlain(document: RichDocument): string {
  return document.blocks.map((block) => block.runs.map((run) => run.text).join("")).join("\n");
}

export function encodeRichDocument(document: RichDocument): string {
  return `${RICH_DOCUMENT_PREFIX}${JSON.stringify(document)}`;
}

export function decodeRichDocument(content: string): RichDocument {
  if (!content.startsWith(RICH_DOCUMENT_PREFIX)) return plainToRich(content);
  let data: unknown;
  try { data = JSON.parse(content.slice(RICH_DOCUMENT_PREFIX.length)); }
  catch { throw new Error("INVALID_RICH_DOCUMENT"); }
  if (!data || typeof data !== "object") throw new Error("INVALID_RICH_DOCUMENT");
  const obj = data as { version?: unknown; blocks?: unknown };
  if (obj.version !== 1 || !Array.isArray(obj.blocks) || obj.blocks.length > 5000) throw new Error("INVALID_RICH_DOCUMENT");
  let chars = 0;
  const blocks: RichBlock[] = obj.blocks.map((raw: unknown) => {
    if (!raw || typeof raw !== "object") throw new Error("INVALID_RICH_DOCUMENT");
    const block = raw as Record<string, unknown>;
    if ((block.type !== "paragraph" && block.type !== "heading") || !aligns.has(block.align as string)
      || !Array.isArray(block.runs) || block.runs.length > 3000) throw new Error("INVALID_RICH_DOCUMENT");
    const runs: RichRun[] = block.runs.map((entry: unknown) => {
      if (!entry || typeof entry !== "object") throw new Error("INVALID_RICH_DOCUMENT");
      const run = entry as Record<string, unknown>;
      if (typeof run.text !== "string" || run.text.length > 180000) throw new Error("INVALID_RICH_DOCUMENT");
      for (const flag of ["bold", "italic", "underline"]) if (run[flag] !== undefined && typeof run[flag] !== "boolean") throw new Error("INVALID_RICH_DOCUMENT");
      chars += run.text.length;
      if (chars > 180000) throw new Error("INVALID_RICH_DOCUMENT");
      return { text: run.text, ...(run.bold ? { bold: true } : {}), ...(run.italic ? { italic: true } : {}), ...(run.underline ? { underline: true } : {}) };
    });
    return { type: block.type as RichBlock["type"], align: block.align as RichAlign, runs };
  });
  return { version: 1, blocks };
}

/** Substitui variáveis dentro de runs, preservando formatação e escapando JSON automaticamente. */
export function replaceRichVariables(content: string, variables: Record<string, string>) {
  if (!content.startsWith(RICH_DOCUMENT_PREFIX)) {
    return content.replace(/\{\{[A-Z0-9_]+\}\}/g, (token) => variables[token] ?? token);
  }
  const document = decodeRichDocument(content);
  return encodeRichDocument({ ...document, blocks: document.blocks.map((block) => ({ ...block,
    runs: block.runs.map((run) => ({ ...run,
      text: run.text.replace(/\{\{[A-Z0-9_]+\}\}/g, (token) => variables[token] ?? token),
    })),
  })) });
}

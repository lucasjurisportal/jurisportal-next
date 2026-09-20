import { readSheet } from "read-excel-file/node";
import { parseCsv } from "./csv-parser";
import { normalizeHeader } from "../domain/import-definition";

export const MAX_IMPORT_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;

export type TabularData = {
  headers: string[];
  rows: Array<Record<string, string>>;
};

function valueToString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value).trim();
}

function rowsToObjects(rawRows: unknown[][]): TabularData {
  if (rawRows.length < 2) throw new Error("IMPORT_EMPTY_FILE");
  const headers = rawRows[0].map((value, index) => valueToString(value) || `Coluna ${index + 1}`);
  const normalizedHeaders = headers.map(normalizeHeader);
  const duplicateIndex = normalizedHeaders.findIndex((header, index) => normalizedHeaders.indexOf(header) !== index);
  if (duplicateIndex >= 0) throw new Error(`IMPORT_DUPLICATE_HEADER:${headers[duplicateIndex]}`);
  const body = rawRows.slice(1).filter((row) => row.some((value) => valueToString(value) !== ""));
  if (body.length > MAX_IMPORT_ROWS) throw new Error("IMPORT_TOO_MANY_ROWS");
  return {
    headers,
    rows: body.map((row) => Object.fromEntries(headers.map((header, index) => [header, valueToString(row[index])]))),
  };
}

export async function parseTabularFile(file: File): Promise<TabularData> {
  if (file.size === 0) throw new Error("IMPORT_EMPTY_FILE");
  if (file.size > MAX_IMPORT_FILE_BYTES) throw new Error("IMPORT_FILE_TOO_LARGE");
  const extension = file.name.toLowerCase().split(".").pop();
  if (extension === "csv") {
    const text = await file.text();
    return rowsToObjects(parseCsv(text));
  }
  if (extension === "xlsx") {
    const buffer = Buffer.from(await file.arrayBuffer());
    const sheet = await readSheet(buffer);
    return rowsToObjects(sheet as unknown[][]);
  }
  throw new Error("IMPORT_UNSUPPORTED_FILE");
}

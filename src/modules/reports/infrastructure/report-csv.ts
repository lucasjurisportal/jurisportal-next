export type CsvCell = string | number | boolean | Date | null | undefined;

function safeSpreadsheetValue(value: string) {
  // Evita fórmula executável ao abrir o CSV em Excel/Sheets.
  return /^[=+\-@]/.test(value.trimStart()) ? `'${value}` : value;
}

function cell(value: CsvCell) {
  let text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  text = safeSpreadsheetValue(text).replace(/"/g, '""');
  return `"${text}"`;
}

export function createCsv(headers: string[], rows: CsvCell[][]) {
  const lines = [headers.map(cell).join(";"), ...rows.map((row) => row.map(cell).join(";"))];
  return `\uFEFF${lines.join("\r\n")}`;
}

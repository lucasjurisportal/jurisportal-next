export function detectDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).filter(Boolean).slice(0, 5);
  const delimiters = [";", ",", "\t"];
  let best = ";";
  let score = -1;
  for (const delimiter of delimiters) {
    const current = sample.reduce((sum, line) => sum + countOutsideQuotes(line, delimiter), 0);
    if (current > score) {
      score = current;
      best = delimiter;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, delimiter: string) {
  let count = 0;
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && char === delimiter) count += 1;
  }
  return count;
}

export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (char === '"') {
      if (quoted && clean[i + 1] === '"') {
        value += '"';
        i += 1;
      } else quoted = !quoted;
      continue;
    }
    if (!quoted && char === delimiter) {
      row.push(value.trim());
      value = "";
      continue;
    }
    if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(value.trim());
      value = "";
      if (row.some((cell) => cell !== "")) rows.push(row);
      row = [];
      continue;
    }
    value += char;
  }

  if (quoted) throw new Error("CSV_UNCLOSED_QUOTE");
  row.push(value.trim());
  if (row.some((cell) => cell !== "")) rows.push(row);
  return rows;
}

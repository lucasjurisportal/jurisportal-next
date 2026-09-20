import assert from "node:assert/strict";
import test from "node:test";
import { detectDelimiter, parseCsv } from "./csv-parser";

test("detecta ponto e vírgula comum no Brasil", () => {
  assert.equal(detectDelimiter("Nome;CPF;Cidade\nLucas;123;São Paulo"), ";");
});

test("preserva delimitador e aspas dentro da célula", () => {
  const rows = parseCsv('Nome;Observações\n"Maria; Silva";"Texto com ""aspas"""');
  assert.deepEqual(rows[1], ["Maria; Silva", 'Texto com "aspas"']);
});

import assert from "node:assert/strict";
import test from "node:test";
import { createCsv } from "./report-csv";

test("CSV protege conteúdo que poderia virar fórmula", () => {
  const csv = createCsv(["Nome"], [["=1+1"]]);
  assert.match(csv, /'=1\+1/);
});

test("CSV escapa aspas", () => {
  const csv = createCsv(["Nome"], [['Cliente "A"']]);
  assert.match(csv, /Cliente ""A""/);
});

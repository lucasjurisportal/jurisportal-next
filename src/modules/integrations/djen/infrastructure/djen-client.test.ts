import assert from "node:assert/strict";
import test from "node:test";
import { searchDjenAllPages } from "./djen-client";

test("OAB e nome usam requisições realmente independentes, por um único dia", async () => {
  const original = globalThis.fetch;
  const queries: URL[] = [];
  try {
    globalThis.fetch = async (input) => {
      queries.push(new URL(String(input)));
      return new Response(JSON.stringify({ count: 0, items: [] }), { status: 200 });
    };
    await searchDjenAllPages({ mode: "OAB", oab: "1234-A", uf: "SP", startDate: "2026-09-18", endDate: "2026-09-18" });
    await searchDjenAllPages({ mode: "NAME", name: "João da Silva", startDate: "2026-09-18", endDate: "2026-09-18" });
    assert.equal(queries[0].searchParams.get("numeroOab"), "1234-A");
    assert.equal(queries[0].searchParams.get("ufOab"), "SP");
    assert.equal(queries[0].searchParams.get("nomeAdvogado"), null);
    assert.equal(queries[1].searchParams.get("numeroOab"), null);
    assert.equal(queries[1].searchParams.get("nomeAdvogado"), "João da Silva");
    assert.equal(queries[1].searchParams.get("meio"), "D");
    assert.equal(queries[1].searchParams.get("itensPorPagina"), "100");
  } finally { globalThis.fetch = original; }
});

test("pagina truncada nunca é contada como captura concluída", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ count: 4, items: [{ id: 1 }] }), { status: 200 });
    await assert.rejects(searchDjenAllPages({ mode: "NAME", name: "Nome Completo",
      startDate: "2026-09-18", endDate: "2026-09-18" }), /DJEN_INCOMPLETE_PAGE/);
  } finally { globalThis.fetch = original; }
});

test("429 interrompe a captura para aguardar próxima execução sem bombardear CNJ", async () => {
  const original = globalThis.fetch;
  let count = 0;
  try {
    globalThis.fetch = async () => { count += 1; return new Response("", { status: 429 }); };
    await assert.rejects(searchDjenAllPages({ mode: "OAB", oab: "1234", uf: "SP",
      startDate: "2026-09-18", endDate: "2026-09-18" }), /DJEN_HTTP_429/);
    assert.equal(count, 1);
  } finally { globalThis.fetch = original; }
});

test("limite de 10 mil devolvido pela API não gera falsa conclusão", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ count: 10000, items: [] }), { status: 200 });
    await assert.rejects(searchDjenAllPages({ mode: "NAME", name: "Nome Completo",
      startDate: "2026-09-18", endDate: "2026-09-18" }), /DJEN_RESULT_LIMIT_REACHED/);
  } finally { globalThis.fetch = original; }
});

import assert from "node:assert/strict";
import test from "node:test";
import { lookupDatajudProcess, lookupDatajudProcessDetail, datajudTimeoutMs } from "./datajud-client";
const cnj = "10008790820148260462";
async function enabled(fn: () => Promise<void>) {
  const prior = { provider: process.env.PROCESS_LOOKUP_PROVIDER, auth: process.env.DATAJUD_ACCESS_AUTHORIZED,
    key: process.env.DATAJUD_API_KEY, commercial: process.env.DATAJUD_COMMERCIAL_AUTHORIZATION_CONFIRMED };
  process.env.PROCESS_LOOKUP_PROVIDER = "datajud-public";
  process.env.DATAJUD_ACCESS_AUTHORIZED = "true";
  process.env.DATAJUD_COMMERCIAL_AUTHORIZATION_CONFIRMED = "true";
  process.env.DATAJUD_API_KEY = "fixture-public-key";
  try { await fn(); } finally {
    for (const [key, value] of Object.entries({ PROCESS_LOOKUP_PROVIDER: prior.provider,
      DATAJUD_ACCESS_AUTHORIZED: prior.auth, DATAJUD_API_KEY: prior.key,
      DATAJUD_COMMERCIAL_AUTHORIZATION_CONFIRMED: prior.commercial })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
}
test("endereço é fixo e busca só por CNJ; resposta incorreta ignorada", async () => enabled(async () => {
  const fetcher = (async (url: string, init: RequestInit) => {
    assert.match(url, /^https:\/\/api-publica\.datajud\.cnj\.jus\.br\/api_publica_tjsp\/_search$/);
    assert.deepEqual(JSON.parse(String(init.body)), { size: 2, query: { term: { numeroProcesso: cnj } }, _source: { includes: ["numeroProcesso", "tribunal", "orgaoJulgador", "classe", "assuntos", "comarca", "forum", "valorCausa", "dataDistribuicao"] } });
    return { ok: true, status: 200, json: async () => ({ hits: { hits: [{ _source: { numeroProcesso: "99999999920248260462" } }] } }) } as Response;
  }) as typeof fetch;
  assert.equal(await lookupDatajudProcess(cnj, fetcher), null);
}));
test("recusa escolha arbitrária entre dois resultados da fonte", async () => enabled(async () => {
  const fetcher = (async () => ({ ok: true, status: 200, json: async () => ({ hits: { hits: [
    { _source: { numeroProcesso: cnj, grau: "G1" } }, { _source: { numeroProcesso: cnj, grau: "G2" } },
  ] } }) } as Response)) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, fetcher), /PROCESS_LOOKUP_MULTIPLE_MATCHES/);
}));
test("consulta bloqueada por padrão mesmo que API esteja acessível", async () => {
  const old = process.env.DATAJUD_ACCESS_AUTHORIZED;
  delete process.env.DATAJUD_ACCESS_AUTHORIZED;
  try { await assert.rejects(lookupDatajudProcess(cnj), /PROCESS_LOOKUP_DISABLED/); }
  finally { if (old === undefined) delete process.env.DATAJUD_ACCESS_AUTHORIZED; else process.env.DATAJUD_ACCESS_AUTHORIZED = old; }
});

test("não seleciona resultado quando a fonte informou mais registros do que retornou", async () => enabled(async () => {
  const fetcher = (async () => ({ ok: true, status: 200, json: async () => ({ hits: {
    total: { value: 9 }, hits: [{ _source: { numeroProcesso: cnj } }],
  } }) } as Response)) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, fetcher), /PROCESS_LOOKUP_MULTIPLE_MATCHES/);
}));
test("resposta 429 não se transforma em sucesso vazio", async () => enabled(async () => {
  const fetcher = (async () => ({ ok: false, status: 429 } as Response)) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, fetcher), /PROCESS_LOOKUP_RATE_LIMIT/);
}));

test("conector usa Justiça Federal 4 e Justiça do Trabalho 5, conforme CNJ", async () => enabled(async () => {
  const cases = [
    ["00000000020244010001", "trf1"],
    ["00000000020245020001", "trt2"],
  ] as const;
  for (const [cnjInput, alias] of cases) {
    const fetcher = (async (url: string) => {
      assert.equal(url, `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`);
      return { ok: true, status: 200, json: async () => ({ hits: { hits: [
        { _source: { numeroProcesso: cnjInput, sistema: { codigo: 4, nome: "EPROC" },
          movimentos: [{ codigo: 26, nome: "Distribuição", dataHora: "2024-01-03T10:00:00.000Z" }] } },
      ] } }) } as Response;
    }) as typeof fetch;
    const result = await lookupDatajudProcessDetail(cnjInput, fetcher);
    assert.equal(result?.preview.electronicSystem, "EPROC");
    assert.equal(result?.movementsTotal, 1);
    assert.equal(result?.movements[0]?.name, "Distribuição");
  }
}));

// Regressão v45: buscar a capa não pode baixar/processar o array de movimentações.
test("consulta da capa exclui movimentos; consulta de movimentos os mantém", async () => enabled(async () => {
  let calls = 0;
  const fetcher = (async (_url: string, init: RequestInit) => {
    const query = JSON.parse(String(init.body));
    calls++;
    if (calls === 1) {
      assert.deepEqual(query._source, { includes: ["numeroProcesso", "tribunal", "orgaoJulgador", "classe", "assuntos", "comarca", "forum", "valorCausa", "dataDistribuicao"] });
      return { ok: true, status: 200, json: async () => ({ hits: { hits: [
        { _source: { numeroProcesso: cnj, classe: { nome: "Procedimento Comum" } } },
      ] } }) } as Response;
    }
    assert.deepEqual(query._source, { includes: ["numeroProcesso", "tribunal", "movimentos.codigo", "movimentos.nome", "movimentos.dataHora", "movimentos.orgaoJulgador.nomeOrgao", "movimentos.orgaoJulgador.nome"] });
    return { ok: true, status: 200, json: async () => ({ hits: { hits: [
      { _source: { numeroProcesso: cnj, movimentos: [
        { codigo: 26, nome: "Distribuição", dataHora: "2024-01-03T10:00:00.000Z" },
      ] } },
    ] } }) } as Response;
  }) as typeof fetch;
  assert.equal((await lookupDatajudProcess(cnj, fetcher))?.processClass, "Procedimento Comum");
  assert.equal((await lookupDatajudProcessDetail(cnj, fetcher))?.movementsTotal, 1);
  assert.equal(calls, 2);
}));

test("diferencia erro 403 de indisponibilidade e resposta malformada", async () => enabled(async () => {
  const forbidden = (async () => ({ ok: false, status: 403 } as Response)) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, forbidden), /PROCESS_LOOKUP_AUTH_FAILED/);
  const upstream = (async () => ({ ok: false, status: 503 } as Response)) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, upstream), /PROCESS_LOOKUP_SOURCE_UNAVAILABLE/);
  const brokenJson = (async () => new Response("invalid json", { status: 200 })) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, brokenJson), /PROCESS_LOOKUP_INVALID_RESPONSE/);
  const brokenStructure = (async () => ({ ok: true, status: 200, json: async () => ({ error: "unexpected upstream" }) } as Response)) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, brokenStructure), /PROCESS_LOOKUP_INVALID_RESPONSE/);
}));

test("falha de rede tem erro próprio, sem expor detalhes do fetch", async () => enabled(async () => {
  const fetcher = (async () => { throw new TypeError("internal network details"); }) as typeof fetch;
  await assert.rejects(lookupDatajudProcess(cnj, fetcher), /PROCESS_LOOKUP_NETWORK_ERROR/);
}));

// Nunca considerar resposta HTTP 200 com timed_out=true uma consulta completa.
test("DataJud com resultado parcial por timeout não é tratado como sucesso", async () => enabled(async () => {
  const fetcher = (async () => new Response(JSON.stringify({ timed_out: true, hits: { hits: [
    { _source: { numeroProcesso: cnj, movimentos: [{ codigo: 26, nome: "Distribuição" }] } },
  ] } }), { status: 200, headers: { "content-type": "application/json" } })) as typeof fetch;
  await assert.rejects(lookupDatajudProcessDetail(cnj, fetcher), /PROCESS_LOOKUP_TIMEOUT/);
}));


test("orçamento da capa não é o antigo limite de 18s e configuração é limitada", () => {
  assert.equal(datajudTimeoutMs("preview", {}), 45_000);
  assert.equal(datajudTimeoutMs("movements", {}), 20_000);
  assert.equal(datajudTimeoutMs("preview", { DATAJUD_PREVIEW_TIMEOUT_MS: "52000" }), 52_000);
  assert.equal(datajudTimeoutMs("preview", { DATAJUD_PREVIEW_TIMEOUT_MS: "300000" }), 45_000);
  assert.equal(datajudTimeoutMs("preview", { DATAJUD_PREVIEW_TIMEOUT_MS: "abc" }), 45_000);
});

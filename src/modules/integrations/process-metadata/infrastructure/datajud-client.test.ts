import assert from "node:assert/strict";
import test from "node:test";
import { lookupDatajudProcess } from "./datajud-client";
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
    assert.deepEqual(JSON.parse(String(init.body)), { size: 5, query: { term: { numeroProcesso: cnj } } });
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

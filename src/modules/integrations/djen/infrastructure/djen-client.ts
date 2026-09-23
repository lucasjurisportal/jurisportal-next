/** Contrato público GET /api/v1/comunicacao, Swagger CNJ 1.0.4 (04/03/2026).
 * nomeAdvogado é uma BUSCA INDEPENDENTE, não filtro local da busca OAB.
 * A documentação indica paginação com 5 ou 100 itens e limite 10.000 para texto/OAB.
 */
const DJEN_API_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const PAGE_SIZE = 100;
const MAX_RESULTS = 10_000;
const HTTP_RETRIES = 2;

export type DjenSearchParams = {
  startDate: string;
  endDate: string;
} & ({ mode: "OAB"; oab: string; uf: string } | { mode: "NAME"; name: string });

type DjenPage = { count: number; items: unknown[] };

function sleep(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }

function normalizePage(value: unknown): DjenPage {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  if (typeof record.count !== "number" || !Number.isSafeInteger(record.count)
    || record.count < 0 || !Array.isArray(record.items)) {
    throw new Error("DJEN_INVALID_PAGE");
  }
  return { count: record.count as number, items: record.items as unknown[] };
}

async function requestDjenPage(params: DjenSearchParams, page: number): Promise<DjenPage> {
  const query = new URLSearchParams({
    dataDisponibilizacaoInicio: params.startDate,
    dataDisponibilizacaoFim: params.endDate,
    pagina: String(page),
    itensPorPagina: String(PAGE_SIZE),
    meio: "D", // somente Diário, não editais da plataforma
  });
  if (params.mode === "OAB") {
    query.set("numeroOab", params.oab.trim());
    query.set("ufOab", params.uf.trim().toUpperCase());
  } else {
    query.set("nomeAdvogado", params.name.trim());
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${DJEN_API_URL}?${query}`, {
      headers: { Accept: "application/json", "User-Agent": "Jurisportal-Next/1.0" },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      // Nunca despejar body de terceiros nos logs: pode conter dados pessoais.
      const error = new Error(`DJEN_HTTP_${response.status}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return normalizePage(await response.json());
  } finally { clearTimeout(timeout); }
}

async function fetchDjenPage(params: DjenSearchParams, page: number): Promise<DjenPage> {
  for (let attempt = 0; ; attempt += 1) {
    try { return await requestDjenPage(params, page); }
    catch (error) {
      const status = (error as Error & { status?: number }).status;
      // CNJ orienta aguardar 1 minuto após 429; devolver ao scheduler, sem loop de abuso.
      if (status === 429) throw error;
      const retryable = (error instanceof Error && error.name === "AbortError")
        || (typeof status === "number" && status >= 500);
      if (!retryable || attempt >= HTTP_RETRIES) throw error;
      await sleep(600 * (attempt + 1));
    }
  }
}

/** Um dia por consulta; não aceitar resultados cortados como janela concluída. */
export async function searchDjenAllPages(params: DjenSearchParams): Promise<unknown[]> {
  if (params.startDate !== params.endDate || !/^\d{4}-\d{2}-\d{2}$/.test(params.startDate)
    || Number.isNaN(Date.parse(`${params.startDate}T00:00:00Z`))) {
    throw new Error("DJEN_EXPECTS_SINGLE_DAY");
  }
  if (params.mode === "NAME" && !params.name.trim()) throw new Error("DJEN_NAME_REQUIRED");
  const all: unknown[] = [];
  let count: number | null = null;
  for (let page = 1; page <= Math.ceil(MAX_RESULTS / PAGE_SIZE); page += 1) {
    let result = await fetchDjenPage(params, page);
    count ??= result.count;
    if (result.count !== count) throw new Error("DJEN_COUNT_CHANGED_RETRY_WINDOW");
    if (count >= MAX_RESULTS) throw new Error("DJEN_RESULT_LIMIT_REACHED");
    if (result.items.length === 0 && all.length < count) {
      // Eventual indexação atrasada do DJeN: repetir página antes de falhar.
      await sleep(400);
      result = await fetchDjenPage(params, page);
    }
    if (result.count !== count || result.items.length === 0 && all.length < count) {
      throw new Error("DJEN_INCOMPLETE_PAGE");
    }
    if (result.items.length > PAGE_SIZE || all.length + result.items.length > count) {
      throw new Error("DJEN_INVALID_PAGE_SIZE");
    }
    all.push(...result.items);
    if (all.length === count) return all;
    if (result.items.length !== PAGE_SIZE) throw new Error("DJEN_INCOMPLETE_PAGE");
    await sleep(250);
  }
  throw new Error("DJEN_PAGE_LIMIT_REACHED");
}

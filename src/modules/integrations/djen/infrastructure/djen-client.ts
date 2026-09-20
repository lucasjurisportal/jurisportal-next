const DJEN_API_URL = "https://comunicaapi.pje.jus.br/api/v1/comunicacao";
const PAGE_SIZE = 50;
const MAX_PAGES = 200;
const EMPTY_PAGE_RETRIES = 2;
const HTTP_RETRIES = 2;

export type DjenSearchParams = {
  oab: string;
  uf: string;
  startDate: string;
  endDate: string;
};

type DjenPage = {
  count: number;
  items: unknown[];
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizePage(value: unknown): DjenPage {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    count: typeof record.count === "number" ? record.count : Number(record.count ?? 0) || 0,
    items: Array.isArray(record.items) ? record.items : [],
  };
}

async function requestDjenPage(params: DjenSearchParams, page: number): Promise<DjenPage> {
  const query = new URLSearchParams({
    numeroOab: params.oab.trim(),
    ufOab: params.uf.trim().toUpperCase(),
    dataDisponibilizacaoInicio: params.startDate,
    dataDisponibilizacaoFim: params.endDate,
    pagina: String(page),
    itensPorPagina: String(PAGE_SIZE),
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(`${DJEN_API_URL}?${query}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": "Jurisportal-Next/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      if (response.status === 403) throw new Error("DJEN_HTTP_403");
      const error = new Error(`DJEN_HTTP_${response.status}:${body.slice(0, 200)}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }
    return normalizePage(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDjenPage(params: DjenSearchParams, page: number): Promise<DjenPage> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= HTTP_RETRIES; attempt += 1) {
    try {
      return await requestDjenPage(params, page);
    } catch (error) {
      lastError = error;
      const status = (error as Error & { status?: number }).status;
      const retryable = error instanceof DOMException && error.name === "AbortError"
        || status === 429
        || (typeof status === "number" && status >= 500);
      if (!retryable || attempt === HTTP_RETRIES) throw error;
      await sleep(500 * (attempt + 1));
    }
  }
  throw lastError;
}

/** Busca todas as páginas de uma combinação OAB/UF no intervalo solicitado. */
export async function searchDjenAllPages(params: DjenSearchParams): Promise<unknown[]> {
  const all: unknown[] = [];
  let expectedCount: number | null = null;

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    let result = await fetchDjenPage(params, page);
    expectedCount ??= result.count;

    if (result.items.length === 0 && expectedCount > all.length) {
      for (let retry = 1; retry <= EMPTY_PAGE_RETRIES && result.items.length === 0; retry += 1) {
        await sleep(350 * retry);
        result = await fetchDjenPage(params, page);
      }
    }

    if (result.items.length === 0) break;
    all.push(...result.items);

    if (all.length >= (expectedCount ?? 0) || result.items.length < PAGE_SIZE) break;
    await sleep(300);
  }

  return all;
}

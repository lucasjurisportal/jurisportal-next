import {
  courtAliasForCnj, normalizeDatajudMovements, normalizeDatajudProcess,
  type ExternalProcessMovement, type ProcessLookupPreview,
} from "../domain/process-metadata";
import { normalizeCnjDigits } from "@/modules/processes/domain/cnj-number";
import { request as httpsRequest } from "node:https";

const ORIGIN = "https://api-publica.datajud.cnj.jus.br";

export function isProcessLookupEnabled(): boolean {
  return process.env.PROCESS_LOOKUP_PROVIDER === "datajud-public"
    && process.env.DATAJUD_ACCESS_AUTHORIZED === "true"
    && (process.env.NODE_ENV !== "production" || process.env.DATAJUD_COMMERCIAL_AUTHORIZATION_CONFIRMED === "true")
    && Boolean(process.env.DATAJUD_API_KEY);
}

/** Códigos públicos, sem devolver chave, resposta bruta da fonte ou dados pessoais no erro. */
export class ProcessLookupError extends Error {
  constructor(public readonly code: string, public readonly upstreamStatus?: number) {
    super(code);
    this.name = "ProcessLookupError";
  }
}

export type ProcessLookupDetail = {
  preview: ProcessLookupPreview;
  movements: ExternalProcessMovement[];
  movementsTotal: number;
  movementsTruncated: boolean;
};

type QueryMode = "preview" | "movements";

/** Orçamento de tempo para fontes externas; consulta da capa não deve expirar em 18s
 * apenas por lentidão do cluster. Variáveis são ajustáveis sem modificar código.
 * O servidor ainda pode impor um limite menor; o diagnóstico informa isso.
 */
export function datajudTimeoutMs(mode: QueryMode, env: {
  NODE_ENV?: string;
  DATAJUD_PREVIEW_TIMEOUT_MS?: string;
  DATAJUD_MOVEMENTS_TIMEOUT_MS?: string;
} = process.env): number {
  const fallback = mode === "preview" ? 45_000 : 20_000;
  const candidate = Number(env[mode === "preview" ? "DATAJUD_PREVIEW_TIMEOUT_MS" : "DATAJUD_MOVEMENTS_TIMEOUT_MS"]);
  return Number.isFinite(candidate) && candidate >= 10_000 && candidate <= 55_000 ? Math.round(candidate) : fallback;
}


// A listagem de movimentos não precisa da capa nem de outros campos volumosos.
// O filtro limita os CAMPOS retornados, não corta o array na origem; se a API
// estiver lenta/indisponível, a consulta pode continuar falhando.
const PREVIEW_FIELDS = [
  "numeroProcesso", "tribunal", "orgaoJulgador", "classe", "assuntos",
  "comarca", "forum", "valorCausa", "dataDistribuicao",
] as const;
const MOVEMENT_FIELDS = [
  "numeroProcesso", "tribunal", "movimentos.codigo", "movimentos.nome",
  "movimentos.dataHora", "movimentos.orgaoJulgador.nomeOrgao",
  "movimentos.orgaoJulgador.nome",
] as const;

export function datajudQuery(cnj: string, mode: QueryMode) {
  return {
    size: 2,
    query: { term: { numeroProcesso: cnj } },
    _source: { includes: mode === "preview" ? [...PREVIEW_FIELDS] : [...MOVEMENT_FIELDS] },
  };
}


/** Alternativa explícita para diagnosticar ambientes com IPv6 sem rota funcional.
 * NÃO altera o fetch padrão nem muda DNS global do Next.js. Ativar apenas após
 * o diagnóstico de conectividade indicar IPv4 alcançável e fetch sem resposta.
 */
async function postDatajudIpv4(url: string, body: string, key: string, signal: AbortSignal): Promise<Response> {
  return new Promise<Response>((resolve, reject) => {
    const request = httpsRequest(url, {
      method: "POST", family: 4, signal,
      headers: { "content-type": "application/json", authorization: `APIKey ${key}` },
    }, (response) => {
      const chunks: Buffer[] = [];
      let size = 0;
      const maxBytes = 20 * 1024 * 1024;
      response.on("data", (part: Buffer) => {
        size += part.length;
        if (size > maxBytes) {
          request.destroy(new Error("DATAJUD_RESPONSE_TOO_LARGE"));
          return;
        }
        chunks.push(part);
      });
      response.on("error", reject);
      response.on("end", () => {
        const status = response.statusCode ?? 502;
        resolve(new Response(Buffer.concat(chunks), {
          status: status >= 200 && status <= 599 ? status : 502,
          headers: { "content-type": response.headers["content-type"] ?? "application/json" },
        }));
      });
    });
    request.on("error", reject);
    request.end(body);
  });
}

async function lookup(cnjInput: string, mode: QueryMode, fetcher: typeof fetch): Promise<ProcessLookupDetail | null> {
  if (!isProcessLookupEnabled()) throw new ProcessLookupError("PROCESS_LOOKUP_DISABLED");
  const cnj = normalizeCnjDigits(cnjInput);
  const alias = courtAliasForCnj(cnj);
  if (!alias) throw new ProcessLookupError("PROCESS_LOOKUP_COURT_UNSUPPORTED");
  const key = process.env.DATAJUD_API_KEY?.trim();
  if (!key) throw new ProcessLookupError("PROCESS_LOOKUP_DISABLED");

  const body = datajudQuery(cnj, mode);
  const controller = new AbortController();
  const startedAt = Date.now();
  // A verificação complementar não deve manter o advogado esperando 30 segundos
  // para descobrir que a origem não respondeu. Não altera o prazo da capa.
  const timeoutMs = datajudTimeoutMs(mode);
  // "headers" indica aguardo de resposta HTTP, NÃO prova falha de TCP/DNS/TLS.
  let stage: "headers" | "body" | "parse" = "headers";
  let upstreamTookMs: number | null = null;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      const url = `${ORIGIN}/api_publica_${alias}/_search`;
      response = process.env.DATAJUD_FORCE_IPV4 === "true" && fetcher === fetch
        ? await postDatajudIpv4(url, JSON.stringify(body), key, controller.signal)
        : await fetcher(url, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `APIKey ${key}` },
          body: JSON.stringify(body), signal: controller.signal, cache: "no-store",
        });
    } catch (cause) {
      // Apenas o código técnico, nunca URL/CNJ, corpo, chave ou mensagem bruta.
      const networkCode = cause && typeof cause === "object" && "cause" in cause
        && cause.cause && typeof cause.cause === "object" && "code" in cause.cause
        && typeof cause.cause.code === "string" ? cause.cause.code : undefined;
      console.warn("[datajud.transport]", { mode, court: alias, networkCode: networkCode?.slice(0, 40), ipv4Forced: process.env.DATAJUD_FORCE_IPV4 === "true" });
      throw new ProcessLookupError(controller.signal.aborted ? "PROCESS_LOOKUP_TIMEOUT" : "PROCESS_LOOKUP_NETWORK_ERROR");
    }
    stage = "body";
    if (response.status === 429) throw new ProcessLookupError("PROCESS_LOOKUP_RATE_LIMIT", response.status);
    if (response.status === 401 || response.status === 403) throw new ProcessLookupError("PROCESS_LOOKUP_AUTH_FAILED", response.status);
    if (response.status === 408 || response.status === 504) throw new ProcessLookupError("PROCESS_LOOKUP_TIMEOUT", response.status);
    if (!response.ok) throw new ProcessLookupError("PROCESS_LOOKUP_SOURCE_UNAVAILABLE", response.status);

    let raw: unknown;
    try { raw = await response.json() as unknown; }
    catch { throw new ProcessLookupError(controller.signal.aborted ? "PROCESS_LOOKUP_TIMEOUT" : "PROCESS_LOOKUP_INVALID_RESPONSE"); }
    stage = "parse";
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ProcessLookupError("PROCESS_LOOKUP_INVALID_RESPONSE");
    const root = raw as Record<string, unknown>;
    upstreamTookMs = typeof root.took === "number" && Number.isFinite(root.took) ? root.took : null;
    // Elasticsearch pode retornar HTTP 200 com resultado parcial por timeout.
    // Não gravar essa resposta como verificação concluída.
    if (root.timed_out === true) throw new ProcessLookupError("PROCESS_LOOKUP_TIMEOUT");
    if (!root.hits || typeof root.hits !== "object" || Array.isArray(root.hits)) {
      throw new ProcessLookupError("PROCESS_LOOKUP_INVALID_RESPONSE");
    }
    const hitsBlock = root.hits as Record<string, unknown>;
    if (!Array.isArray(hitsBlock.hits)) throw new ProcessLookupError("PROCESS_LOOKUP_INVALID_RESPONSE");
    const hits = hitsBlock.hits;
    const totalBlock = hitsBlock.total && typeof hitsBlock.total === "object"
      ? hitsBlock.total as Record<string, unknown> : {};
    const total = typeof totalBlock.value === "number" ? totalBlock.value
      : typeof hitsBlock.total === "number" ? hitsBlock.total : null;
    if (total !== null && total > hits.length) throw new ProcessLookupError("PROCESS_LOOKUP_MULTIPLE_MATCHES");

    const valid = hits.map((hit) => {
      const source = hit && typeof hit === "object" ? (hit as Record<string, unknown>)._source : null;
      const preview = normalizeDatajudProcess(source, cnj);
      if (!preview) return null;
      const movementResult = mode === "movements" ? normalizeDatajudMovements(source)
        : { items: [] as ExternalProcessMovement[], total: 0, truncated: false };
      return {
        preview, movements: movementResult.items, movementsTotal: movementResult.total,
        movementsTruncated: movementResult.truncated,
      };
    }).filter((item): item is ProcessLookupDetail => Boolean(item));
    if (valid.length > 1) throw new ProcessLookupError("PROCESS_LOOKUP_MULTIPLE_MATCHES");
    return valid[0] ?? null;
  } catch (error) {
    const code = controller.signal.aborted ? "PROCESS_LOOKUP_TIMEOUT"
      : error instanceof ProcessLookupError ? error.code : "PROCESS_LOOKUP_INVALID_RESPONSE";
    // Diagnóstico sem CNJ, nome, conteúdo, chave pública ou corpo retornado.
    console.warn("[datajud.lookup]", { mode, court: alias, code, stage, elapsedMs: Date.now() - startedAt,
      timeoutMs, upstreamTookMs,
      upstreamStatus: error instanceof ProcessLookupError ? error.upstreamStatus : undefined });
    if (controller.signal.aborted) throw new ProcessLookupError("PROCESS_LOOKUP_TIMEOUT");
    if (error instanceof ProcessLookupError) throw error;
    throw new ProcessLookupError("PROCESS_LOOKUP_INVALID_RESPONSE");
  } finally {
    clearTimeout(timer);
  }
}

/** Capa leve: nunca busca o conteúdo completo dos movimentos apenas para preencher o formulário. */
export async function lookupDatajudProcess(cnjInput: string, fetcher: typeof fetch = fetch): Promise<ProcessLookupPreview | null> {
  return (await lookup(cnjInput, "preview", fetcher))?.preview ?? null;
}

/** Movimentações sob demanda, apenas após a API validar processo e organização do usuário. */
export async function lookupDatajudProcessDetail(cnjInput: string, fetcher: typeof fetch = fetch): Promise<ProcessLookupDetail | null> {
  return lookup(cnjInput, "movements", fetcher);
}

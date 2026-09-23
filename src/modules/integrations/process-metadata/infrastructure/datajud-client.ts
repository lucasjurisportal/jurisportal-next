import { courtAliasForCnj, normalizeDatajudProcess, type ProcessLookupPreview } from "../domain/process-metadata";
import { normalizeCnjDigits } from "@/modules/processes/domain/cnj-number";

const ORIGIN = "https://api-publica.datajud.cnj.jus.br";
export function isProcessLookupEnabled(): boolean {
  return process.env.PROCESS_LOOKUP_PROVIDER === "datajud-public"
    && process.env.DATAJUD_ACCESS_AUTHORIZED === "true"
    && (process.env.NODE_ENV !== "production" || process.env.DATAJUD_COMMERCIAL_AUTHORIZATION_CONFIRMED === "true")
    && Boolean(process.env.DATAJUD_API_KEY);
}

/** O DataJud público possui restrições de exploração comercial: desligado até autorização comprovada. */
export async function lookupDatajudProcess(cnjInput: string, fetcher: typeof fetch = fetch): Promise<ProcessLookupPreview | null> {
  if (!isProcessLookupEnabled()) throw new Error("PROCESS_LOOKUP_DISABLED");
  const cnj = normalizeCnjDigits(cnjInput);
  const alias = courtAliasForCnj(cnj);
  if (!alias) throw new Error("PROCESS_LOOKUP_COURT_UNSUPPORTED");
  const key = process.env.DATAJUD_API_KEY?.trim();
  if (!key) throw new Error("PROCESS_LOOKUP_DISABLED");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    // URL construída exclusivamente de alias previamente mapeado, sem SSRF por entrada do usuário.
    const response = await fetcher(`${ORIGIN}/api_publica_${alias}/_search`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `APIKey ${key}` },
      body: JSON.stringify({ size: 5, query: { term: { numeroProcesso: cnj } } }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (response.status === 429) throw new Error("PROCESS_LOOKUP_RATE_LIMIT");
    if (!response.ok) throw new Error("PROCESS_LOOKUP_SOURCE_UNAVAILABLE");
    const raw = await response.json() as unknown;
    const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    const hitsBlock = root.hits && typeof root.hits === "object" ? root.hits as Record<string, unknown> : {};
    const hits = Array.isArray(hitsBlock.hits) ? hitsBlock.hits : [];
    const totalBlock = hitsBlock.total && typeof hitsBlock.total === "object"
      ? hitsBlock.total as Record<string, unknown> : {};
    const total = typeof totalBlock.value === "number" ? totalBlock.value
      : typeof hitsBlock.total === "number" ? hitsBlock.total : null;
    // Não afirmar unicidade quando a fonte tem mais resultados que a janela consultada.
    if (total !== null && total > hits.length) throw new Error("PROCESS_LOOKUP_MULTIPLE_MATCHES");
    const valid = hits.map((hit) => normalizeDatajudProcess(
      hit && typeof hit === "object" ? (hit as Record<string, unknown>)._source : null, cnj,
    )).filter((item): item is ProcessLookupPreview => Boolean(item));
    // Diferentes instâncias/órgãos podem ter o mesmo CNJ. Não escolher aleatoriamente.
    if (valid.length > 1) throw new Error("PROCESS_LOOKUP_MULTIPLE_MATCHES");
    return valid[0] ?? null;
  } catch (error) {
    if (controller.signal.aborted) throw new Error("PROCESS_LOOKUP_TIMEOUT");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

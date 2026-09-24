/** Executar apenas no computador de desenvolvimento: npm run diagnose:datajud -- <CNJ>
 * Não imprime chave, CNJ, URL com dados, resposta da fonte ou documentos.
 */
import { config } from "dotenv";
config({ path: ".env.local", quiet: true });

async function run() {
  const raw = process.argv[2] ?? "";
  if (!/^\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}$/.test(raw.trim())) {
    console.error("Informe um CNJ completo como argumento (20 dígitos, com ou sem máscara). Não envie esse número ao chat.");
    process.exitCode = 1;
    return;
  }
  const { lookupDatajudProcess, ProcessLookupError, datajudTimeoutMs } = await import("../../src/modules/integrations/process-metadata/infrastructure/datajud-client");
  const started = Date.now();
  console.log("Teste local DataJud; chave e CNJ não são exibidos. Limite da capa:", datajudTimeoutMs("preview"), "ms");
  try {
    const preview = await lookupDatajudProcess(raw);
    console.log({ outcome: preview ? "FOUND" : "NOT_FOUND", elapsedMs: Date.now() - started,
      fieldsAvailable: preview ? ["court", "division", "district", "forum", "processClass", "subject", "caseValue", "distributionDate"].filter((field) => Boolean(preview[field as keyof typeof preview])).length : 0 });
  } catch (error) {
    console.log({ outcome: error instanceof ProcessLookupError ? error.code : "UNEXPECTED_ERROR", elapsedMs: Date.now() - started,
      upstreamStatus: error instanceof ProcessLookupError ? error.upstreamStatus : undefined });
    process.exitCode = 1;
  }
}
void run();

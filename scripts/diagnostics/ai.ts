/** npm run diagnose:ai: somente leitura de .env.local; não envia texto ao provedor. */
import { config } from "dotenv";
import { readAiProviderConfig } from "../../src/modules/ai/infrastructure/ai-provider-config";
config({ path: ".env.local", quiet: true });

const provider = readAiProviderConfig(process.env);
const problems: string[] = [];
if (!provider.enabled) problems.push("AI_PROVIDER_ENABLED está false");
if (!provider.apiKey) problems.push("OPENAI_API_KEY não configurada");
if (!provider.lunaModel) problems.push("OPENAI_MODEL_LUNA não configurado");
if (!provider.terraModel) problems.push("OPENAI_MODEL_TERRA não configurado");

console.log("IA Jurisportal | diagnóstico LOCAL (não envia conteúdo nem mostra segredos)");
console.log(`Provedor habilitado: ${provider.enabled ? "SIM" : "NÃO"}`);
console.log(`Chave presente: ${provider.apiKey ? "SIM" : "NÃO"}`);
console.log(`Modelo Luna configurado: ${provider.lunaModel ? "SIM" : "NÃO"}`);
console.log(`Modelo Terra configurado: ${provider.terraModel ? "SIM" : "NÃO"}`);
console.log(problems.length ? `Ajustar: ${problems.join("; ")}` : "Configuração local: PRESENTE");
console.log("Acesso real aos modelos e entrega de resposta: NÃO AFERIDOS por este comando.");
if (problems.length) process.exitCode = 1;

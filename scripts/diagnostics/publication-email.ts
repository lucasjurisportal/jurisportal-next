/** npm run diagnose:publication-email: somente leitura de .env.local; não envia mensagens. */
import { config } from "dotenv";
import { publicationEmailSetup } from "../../src/modules/publications/domain/publication-email-config";
config({ path: ".env.local", quiet: true });
const setup = publicationEmailSetup(process.env);
const labels: Record<string,string> = {
  KEY_MISSING: "RESEND_API_KEY ausente/inválida",
  FROM_MISSING: "RESEND_FROM ausente/inválido",
  FROM_PLACEHOLDER: "RESEND_FROM ainda é exemplo ou remetente de teste",
  APP_URL_INVALID: "NEXT_PUBLIC_APP_URL ou BETTER_AUTH_URL ausente/inválida",
};
console.log("E-mails DJeN | diagnóstico LOCAL (sem mostrar chaves, e-mails ou dados de processos)");
console.log("Configuração básica:", setup.configured ? "PRESENTE" : "INCOMPLETA");
console.log("Envio habilitado:", setup.enabled ? "SIM" : "NÃO (homologação)");
for (const issue of setup.issues) console.log("Ajustar:", labels[issue]);
console.log("Domínio verificado no Resend: NÃO AFERIDO por este comando.");
console.log("Entrega real em caixa postal: NÃO AFERIDA por este comando.");
console.log("O CRON permanece desligado; teste real somente em staging com destinatário controlado.");
if (!setup.configured) process.exitCode = 1;

/** Pré-validação local. NÃO verifica domínio remoto nem entrega de mensagens. Sem logging de segredos. */
export type MailEnvironment = {
  NODE_ENV?: "development" | "production" | "test";
  RESEND_API_KEY?: string;
  RESEND_FROM?: string;
  PUBLICATION_EMAIL_ENABLED?: string;
  NEXT_PUBLIC_APP_URL?: string;
  BETTER_AUTH_URL?: string;
};
export type MailSetupIssue = "KEY_MISSING" | "FROM_MISSING" | "FROM_PLACEHOLDER" | "APP_URL_INVALID";

export function publicationEmailSetup(env: MailEnvironment) {
  const issues: MailSetupIssue[] = [];
  const key = env.RESEND_API_KEY?.trim() ?? "";
  if (!key.startsWith("re_") || key.length < 10) issues.push("KEY_MISSING");
  const from = env.RESEND_FROM?.trim() ?? "";
  const match = from.match(/^(?:[^<>\r\n]+\s*<)?([\w.!#$%&'*+/=?^`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+)>?$/i);
  if (!match) issues.push("FROM_MISSING");
  else if (/(seu-dominio|example\.|exemplo\.|localhost|resend\.dev)/i.test(match[1])) issues.push("FROM_PLACEHOLDER");
  const rawUrl = env.NEXT_PUBLIC_APP_URL || env.BETTER_AUTH_URL || "";
  try {
    const url = new URL(rawUrl);
    if (url.username || url.password || (url.protocol !== "https:" &&
      !(url.protocol === "http:" && url.hostname === "localhost"))) issues.push("APP_URL_INVALID");
  } catch { issues.push("APP_URL_INVALID"); }
  return { configured: issues.length === 0, enabled: env.PUBLICATION_EMAIL_ENABLED === "true", issues };
}

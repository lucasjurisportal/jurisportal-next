type SupportEmailInput = {
  requesterName: string;
  requesterEmail: string;
  officeName: string;
  role: string;
  topic: string;
  message: string;
};

function requiredEnv(name: "RESEND_API_KEY" | "JURISPORTAL_SUPPORT_EMAIL") {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name}_NOT_CONFIGURED`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char] ?? char));
}

export async function sendSupportEmail(input: SupportEmailInput) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const to = requiredEnv("JURISPORTAL_SUPPORT_EMAIL");
  const from = process.env.RESEND_FROM || "Jurisportal Next <onboarding@resend.dev>";
  const safeMessage = escapeHtml(input.message).replace(/\n/g, "<br />");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: input.requesterEmail,
      subject: `[Suporte Jurisportal] ${input.topic} · ${input.officeName}`,
      text: `Solicitação de suporte\n\nAssunto: ${input.topic}\nEscritório: ${input.officeName}\nUsuário: ${input.requesterName} (${input.requesterEmail})\nPerfil: ${input.role}\n\n${input.message}`,
      html: `<div style="font-family:Arial,sans-serif;color:#17223b;line-height:1.55"><h2>Solicitação de suporte</h2><p><strong>Assunto:</strong> ${escapeHtml(input.topic)}</p><p><strong>Escritório:</strong> ${escapeHtml(input.officeName)}</p><p><strong>Usuário:</strong> ${escapeHtml(input.requesterName)} &lt;${escapeHtml(input.requesterEmail)}&gt;</p><p><strong>Perfil:</strong> ${escapeHtml(input.role)}</p><hr style="border:0;border-top:1px solid #e6ebf2"/><p>${safeMessage}</p></div>`,
    }),
  });
  const body = await response.json().catch(() => null) as { id?: string; message?: string } | null;
  if (!response.ok) throw new Error(body?.message || `SUPPORT_EMAIL_HTTP_${response.status}`);
  return body?.id ?? null;
}

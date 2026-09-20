type SendReportEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function requiredEnv(name: "RESEND_API_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não foi configurada no ambiente.`);
  return value;
}

export async function sendReportEmail(input: SendReportEmailInput): Promise<string | null> {
  const from = process.env.RESEND_FROM || "Jurisportal Next <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requiredEnv("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(body?.message || `Resend retornou HTTP ${response.status}.`);
  }
  return body?.id ?? null;
}

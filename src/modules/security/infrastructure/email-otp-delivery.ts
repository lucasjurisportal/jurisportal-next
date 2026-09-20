import type { SecurityChallengePurpose } from "../domain/security-policy";

type SendOtpEmailInput = {
  to: string;
  code: string;
  purpose: SecurityChallengePurpose;
};

function requiredEnv(name: "RESEND_API_KEY") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não foi configurada no ambiente.`);
  return value;
}

function subjectFor(purpose: SecurityChallengePurpose) {
  if (purpose === "EMAIL_VERIFICATION") return "Confirme seu e-mail no Jurisportal";
  if (purpose === "ACCOUNT_RECOVERY") return "Recuperação de acesso ao Jurisportal";
  return "Seu código de acesso ao Jurisportal";
}

function explanationFor(purpose: SecurityChallengePurpose) {
  if (purpose === "EMAIL_VERIFICATION") {
    return "Use este código para confirmar que este e-mail pertence a você.";
  }
  if (purpose === "ACCOUNT_RECOVERY") {
    return "Use este código para recuperar o acesso após o bloqueio de segurança.";
  }
  return "Use este código como segunda etapa do seu login.";
}

export async function sendOtpEmail(input: SendOtpEmailInput): Promise<string | null> {
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
      subject: subjectFor(input.purpose),
      text: [
        explanationFor(input.purpose),
        "",
        `Código: ${input.code}`,
        "",
        "Ele expira em 10 minutos. Nunca compartilhe este código.",
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#172033">
          <h2 style="margin-bottom:8px">Jurisportal Next</h2>
          <p>${explanationFor(input.purpose)}</p>
          <div style="font-size:30px;font-weight:700;letter-spacing:8px;padding:18px 0">${input.code}</div>
          <p style="font-size:14px;color:#667085">O código expira em 10 minutos. Nunca compartilhe este código.</p>
        </div>
      `,
    }),
  });

  const body = (await response.json().catch(() => null)) as { id?: string; message?: string } | null;
  if (!response.ok) {
    throw new Error(body?.message || `Resend retornou HTTP ${response.status}.`);
  }
  return body?.id ?? null;
}

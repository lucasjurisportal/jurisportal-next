"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./Auth.module.css";

type Mode = "email-verification" | "login-2fa" | "recovery";

type Props = {
  mode: Mode;
};

const config = {
  "email-verification": {
    eyebrow: "Confirmação de e-mail",
    title: "Confirme seu e-mail",
    lead: "Enviamos um código de 5 caracteres para o e-mail cadastrado.",
    startEndpoint: "/api/security/email-verification/start",
    verifyEndpoint: "/api/security/email-verification/verify",
    submitLabel: "Confirmar e-mail",
  },
  "login-2fa": {
    eyebrow: "Verificação em duas etapas",
    title: "Confirme que é você",
    lead: "Digite o código temporário enviado ao seu e-mail.",
    startEndpoint: "/api/security/login/start",
    verifyEndpoint: "/api/security/login/verify",
    submitLabel: "Confirmar acesso",
  },
  recovery: {
    eyebrow: "Recuperação de acesso",
    title: "Recupere seu acesso",
    lead: "Após o limite de tentativas, a recuperação acontece somente pelo e-mail verificado.",
    startEndpoint: "/api/security/recovery/start",
    verifyEndpoint: "/api/security/recovery/verify",
    submitLabel: "Recuperar acesso",
  },
} as const;

function normalizeCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5);
}

export function SecurityCodeForm({ mode }: Props) {
  const router = useRouter();
  const search = useSearchParams();
  const settings = config[mode];
  const next = useMemo(() => {
    const target = search.get("next");
    return target && target.startsWith("/") ? target : "/app/dashboard";
  }, [search]);

  const [code, setCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);
  const [pending, setPending] = useState(false);
  const [sending, setSending] = useState(false);
  const [retryAfter, setRetryAfter] = useState(0);
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function sendCode() {
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(settings.startEndpoint, { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (mode === "email-verification" && data.status === "already_verified") {
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "login-2fa" && data.next === "authenticated") {
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "login-2fa" && data.next === "verify_email") {
        router.replace(`/verificar-email?next=${encodeURIComponent(next)}`);
        return;
      }
      if (mode === "login-2fa" && data.next === "recovery") {
        router.replace(`/recuperar-acesso?next=${encodeURIComponent(next)}`);
        return;
      }
      if (!response.ok) {
        setError(
          data.error === "DELIVERY_FAILED"
            ? "Não conseguimos enviar o código. Confira a configuração de e-mail e tente novamente."
            : "Não foi possível enviar o código agora.",
        );
        return;
      }

      setDestination(data.destinationMasked ?? null);
      setRetryAfter(Number(data.retryAfterSeconds ?? 60));
      setMessage(data.status === "cooldown" ? "O código anterior ainda é válido." : "Código enviado.");
    } catch {
      setError("Não foi possível enviar o código agora.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    void sendCode();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (retryAfter <= 0) return;
    const timer = window.setInterval(() => {
      setRetryAfter((value) => Math.max(value - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryAfter]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    if (code.length !== 5) {
      setError("Digite os 5 caracteres do código.");
      return;
    }

    setPending(true);
    try {
      const response = await fetch(settings.verifyEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, rememberDevice }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (mode === "login-2fa" && (response.status === 423 || data.reason === "BLOCKED")) {
          router.replace(`/recuperar-acesso?next=${encodeURIComponent(next)}`);
          return;
        }
        if (data.reason === "EXPIRED") {
          setError("Este código expirou. Solicite um novo.");
        } else if (typeof data.attemptsRemaining === "number") {
          setError(`Código incorreto. Restam ${data.attemptsRemaining} tentativa(s).`);
        } else {
          setError("Código inválido ou indisponível.");
        }
        return;
      }

      router.replace(next);
      router.refresh();
    } catch {
      setError("Não foi possível validar o código agora.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <Link className={styles.back} href="/login">← Voltar</Link>
      <span className={styles.authEyebrow}>{settings.eyebrow}</span>
      <h2>{settings.title}</h2>
      <p className={styles.cardLead}>
        {settings.lead} {destination ? `Destino: ${destination}.` : ""} O código expira em 10 minutos.
      </p>

      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="security-code">Código de acesso</label>
          <input
            id="security-code"
            name="security-code"
            inputMode="text"
            autoComplete="one-time-code"
            value={code}
            onChange={(event) => setCode(normalizeCode(event.target.value))}
            placeholder="7KQ4M"
            style={{ textTransform: "uppercase", letterSpacing: ".28em", fontWeight: 900, fontSize: 20 }}
          />
        </div>

        <label className={styles.consentRow}>
          <input
            type="checkbox"
            checked={rememberDevice}
            onChange={(event) => setRememberDevice(event.target.checked)}
          />
          <span>Lembrar este computador por 15 dias.</span>
        </label>

        {message && <div className={styles.formSuccess}>{message}</div>}
        {error && <div className={styles.formError} role="alert">{error}</div>}

        <button className={styles.submit} type="submit" disabled={pending || sending}>
          {pending ? "Validando..." : settings.submitLabel}
        </button>

        <button
          className={styles.secondaryButton}
          type="button"
          disabled={sending || retryAfter > 0}
          onClick={() => void sendCode()}
        >
          {retryAfter > 0 ? `Reenviar em ${retryAfter}s` : sending ? "Enviando..." : "Reenviar código"}
        </button>

        {mode === "login-2fa" && (
          <div className={styles.channelNote}>
            SMS está preparado na arquitetura, mas ficará desligado até contratarmos um provedor.
          </div>
        )}
      </form>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/infrastructure/auth/auth-client";
import { LAST_INTERACTION_STORAGE_KEY } from "@/modules/team/domain/team-activity-policy";
import styles from "./Auth.module.css";

type Props = {
  nextPath?: string;
  adminMode?: boolean;
};

export function LoginForm({ nextPath = "/app/dashboard", adminMode = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inactivityMessage =
    searchParams.get("motivo") === "inatividade-administrador"
      ? "Sua sessão administrativa foi encerrada após 1 hora sem atividade, por segurança."
      : searchParams.get("motivo") === "inatividade"
        ? "Sua sessão foi encerrada após 30 minutos sem atividade."
        : null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: true,
      });

      if (result.error) {
        setError("E-mail ou senha inválidos.");
        return;
      }

      window.localStorage.setItem(LAST_INTERACTION_STORAGE_KEY, String(Date.now()));

      const security = await fetch("/api/security/login/start", { method: "POST" });
      const state = await security.json().catch(() => ({}));
      const next = encodeURIComponent(nextPath);

      if (state.next === "change_password") {
        router.push("/trocar-senha-inicial");
      } else if (state.next === "verify_email") {
        router.push(`/verificar-email?next=${next}`);
      } else if (state.next === "recovery") {
        router.push(`/recuperar-acesso?next=${next}`);
      } else if (state.next === "verify_access") {
        router.push(`/verificar-acesso?next=${next}`);
      } else if (state.next === "authenticated") {
        router.push(nextPath);
        router.refresh();
      } else {
        setError("A senha foi aceita, mas não conseguimos iniciar a verificação de segurança.");
      }
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.card}>
      <Link className={styles.back} href="/">← Voltar</Link>
      <span className={styles.authEyebrow}>{adminMode ? "Administração da plataforma" : "Área do cliente"}</span>
      <h2>{adminMode ? "Entrar como administrador" : "Entrar no Jurisportal"}</h2>
      <p className={styles.cardLead}>
        {adminMode
          ? "A conta mestre exige senha e segundo fator em todo novo dispositivo."
          : "Acesse seu escritório e continue de onde parou."}
      </p>
      {inactivityMessage && <div className={styles.formSuccess}>{inactivityMessage}</div>}
      <form className={styles.form} onSubmit={submit} noValidate>
        <div className={styles.field}>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="voce@escritorio.com.br"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="password">Senha</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>
        <div className={styles.loginOptions}>
          <span>Senha + código temporário de 5 caracteres.</span>
          <span className={styles.mutedAction}>Computador confiável: 15 dias.</span>
        </div>
        {error && <div className={styles.formError} role="alert">{error}</div>}
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Entrando..." : "Entrar"}
        </button>
        {!adminMode && (
          <div className={styles.helper}>
            <span>Ainda não usa o Jurisportal?</span>
            <Link href="/cadastro">Criar uma conta</Link>
          </div>
        )}
      </form>
    </div>
  );
}

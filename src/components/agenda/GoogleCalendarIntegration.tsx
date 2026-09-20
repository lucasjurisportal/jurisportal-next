"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Agenda.module.css";

type Props = {
  connected: boolean;
  connectedAt?: string | null;
  lastUsedAt?: string | null;
  errorCount: number;
  oauthMessage?: string;
};

function messageFor(value?: string) {
  if (value === "connected") return "Google Calendar conectado. Você já pode sincronizar os próximos compromissos.";
  if (value === "access_denied") return "A autorização foi cancelada no Google.";
  if (value === "state_error") return "A autorização expirou ou não pôde ser validada. Tente conectar novamente.";
  if (value === "config_error") return "A configuração do Google Calendar ainda não está completa.";
  if (value === "connection_failed") return "Não foi possível concluir a conexão com o Google Calendar.";
  return "";
}

export function GoogleCalendarIntegration({ connected, connectedAt, lastUsedAt, errorCount, oauthMessage }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(messageFor(oauthMessage));

  async function syncNow() {
    setBusy(true); setMessage("");
    const response = await fetch("/api/integrations/google-calendar/sync", { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) { setMessage("Não foi possível sincronizar agora. A Agenda do Jurisportal continua preservada."); return; }
    setMessage(`Sincronização concluída: ${data.synced ?? 0} evento(s) enviados ao Google${data.failed ? ` e ${data.failed} falha(s)` : ""}.`);
    router.refresh();
  }

  async function disconnect() {
    if (!window.confirm("Desconectar o Google Calendar? Os eventos já enviados ao Google não serão apagados, mas novas alterações deixarão de sincronizar.")) return;
    setBusy(true); setMessage("");
    const response = await fetch("/api/integrations/google-calendar/disconnect", { method: "POST" });
    setBusy(false);
    if (!response.ok) { setMessage("Não foi possível desconectar agora."); return; }
    setMessage("Google Calendar desconectado.");
    router.refresh();
  }

  return <section className={styles.integrationCard}>
    <div className={styles.integrationText}>
      <span className={styles.eyebrow}>Integração individual</span>
      <strong>Google Calendar</strong>
      <p>{connected ? "Conectado. Prazos, tarefas datadas, audiências e compromissos do usuário podem ser enviados ao calendário principal." : "Conecte sua própria conta Google. A Agenda do Jurisportal continua sendo a fonte oficial das datas jurídicas."}</p>
      {connectedAt ? <small>Conectado em {new Date(connectedAt).toLocaleString("pt-BR")}{lastUsedAt ? ` · última sincronização ${new Date(lastUsedAt).toLocaleString("pt-BR")}` : ""}</small> : null}
      {errorCount > 0 ? <small className={styles.integrationWarning}>{errorCount} item(ns) com falha de sincronização. Use “Sincronizar agora” para tentar novamente.</small> : null}
      {message ? <small className={styles.integrationMessage}>{message}</small> : null}
    </div>
    <div className={styles.integrationActions}>
      {!connected ? <a className={styles.primaryButton} href="/api/integrations/google-calendar/connect">Conectar Google Calendar</a> : <>
        <button className={styles.primaryButton} type="button" disabled={busy} onClick={syncNow}>{busy ? "Sincronizando..." : "Sincronizar agora"}</button>
        <button className={styles.secondaryButton} type="button" disabled={busy} onClick={disconnect}>Desconectar</button>
      </>}
    </div>
  </section>;
}

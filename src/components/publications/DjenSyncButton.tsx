"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Publications.module.css";

type CaptureResult = {
  oabsChecked: number;
  sourceItems: number;
  newPublications: number;
  updatedPublications: number;
  linkedToProcesses: number;
  errors: Array<{ oab: string; error: string }>;
  window: { startDate: string; endDate: string };
};

export function DjenSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sync() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/publications/sync", { method: "POST" });
      const body = await response.json().catch(() => null) as { result?: CaptureResult; error?: string } | null;
      if (!response.ok || !body?.result) throw new Error(body?.error || "Falha ao consultar o DJeN.");
      const result = body.result;
      const errorSuffix = result.errors.length ? ` · ${result.errors.length} OAB(s) com erro` : "";
      setMessage(`${result.newPublications} nova(s), ${result.updatedPublications} já conhecida(s), ${result.linkedToProcesses} vinculada(s) a processo${errorSuffix}.`);
      router.refresh();
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "DJEN_SYNC_FAILED";
      setError(code === "DJEN_HTTP_403" ? "O DJeN recusou a consulta (HTTP 403). Vamos verificar a origem da requisição antes de mudar o sistema." : code);
    } finally {
      setLoading(false);
    }
  }

  return <div className={styles.syncBox}>
    <div>
      <strong>Consulta DJeN de desenvolvimento</strong>
      <p>Busca ontem + hoje para as OABs ativas. Repetir é seguro: o banco deduplica as comunicações.</p>
      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
    <button className={styles.primaryButton} type="button" onClick={sync} disabled={loading}>{loading ? "Consultando..." : "Consultar DJeN agora"}</button>
  </div>;
}

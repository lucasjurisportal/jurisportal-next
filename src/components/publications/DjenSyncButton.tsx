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
  reviewCandidates: number;
  reviewItems: number;
  ignoredItems: number;
  uniqueItems: number;
  skippedOabs: number;
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
      const numbers = `O DJeN retornou ${result.sourceItems} resultado(s), incluindo possíveis repetições entre buscas. ${result.newPublications} nova(s) confirmada(s), ${result.updatedPublications} já conhecida(s), ${result.reviewItems} para revisão (${result.reviewCandidates} nova(s) na fila), ${result.ignoredItems} fora da identificação pesquisada. ${result.linkedToProcesses} vinculada(s) a processo.`;
      if (result.errors.length) {
        // Nunca exibir a consulta como sucesso quando alguma OAB falhou.
        const first = result.errors[0]?.error ?? "DJEN_SYNC_FAILED";
        setError(`Consulta incompleta para ${result.errors.length} OAB(s). ${first}. O período será consultado novamente; nenhum prazo foi confirmado.`);
        if (result.newPublications || result.updatedPublications || result.reviewCandidates) setMessage(numbers);
      } else {
        setMessage(numbers);
      }
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
      <strong>Verificação do DJeN</strong>
      <p>Houve uma falha na captura, ou você está testando o sistema. É possível tentar uma consulta manual.</p>
      {message ? <div className={styles.success}>{message}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
    </div>
    <button className={styles.primaryButton} type="button" onClick={sync} disabled={loading}>{loading ? "Consultando..." : "Verificar manualmente"}</button>
  </div>;
}

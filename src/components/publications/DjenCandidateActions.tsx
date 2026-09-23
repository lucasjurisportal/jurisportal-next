"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Publications.module.css";

export function DjenCandidateActions({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function decide(decision: "APPROVE" | "DISMISS") {
    if (decision === "APPROVE" && !window.confirm(
      "Você conferiu na fonte oficial a identidade e a inscrição desta OAB? A aprovação associa a comunicação ao escritório, mas NÃO confirma prazo jurídico.",
    )) return;
    if (decision === "DISMISS" && !window.confirm("Descartar este candidato da fila de revisão?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/publications/review/${candidateId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Falha ao registrar decisão");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Falha ao registrar decisão"); }
    finally { setBusy(false); }
  }
  return <div className={styles.statusLine}>
    <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => decide("APPROVE")}>Confirmar</button>
    <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => decide("DISMISS")}>Descartar</button>
    {error ? <span className={styles.error}>{error}</span> : null}
  </div>;
}

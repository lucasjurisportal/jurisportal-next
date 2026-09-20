"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Processes.module.css";

export function ProcessStatusActions({ processId, status }: { processId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function changeStatus(nextStatus: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/processes/${processId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!response.ok) {
        setError("Não foi possível alterar o status do processo.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.statusActions}>
      {error ? <span className={styles.inlineError}>{error}</span> : null}
      {status !== "ACTIVE" ? <button disabled={busy} type="button" className={styles.secondaryButton} onClick={() => changeStatus("ACTIVE")}>Reativar</button> : null}
      {status === "ACTIVE" ? <button disabled={busy} type="button" className={styles.secondaryButton} onClick={() => changeStatus("CLOSED")}>Encerrar</button> : null}
      {status !== "ARCHIVED" ? <button disabled={busy} type="button" className={styles.dangerButton} onClick={() => changeStatus("ARCHIVED")}>Arquivar</button> : null}
    </div>
  );
}

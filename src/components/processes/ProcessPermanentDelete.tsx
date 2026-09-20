"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./Processes.module.css";

export function ProcessPermanentDelete({ processId, cnj }: { processId: string; cnj: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function removePermanently() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/processes/${processId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(
          response.status === 403
            ? "Esta exclusão é permitida somente ao PLATFORM_MASTER dentro do Jurisportal Internal."
            : "Não foi possível excluir o processo.",
        );
        return;
      }
      router.push("/app/processos");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.dangerZone} aria-labelledby="process-delete-title">
      <div>
        <h2 id="process-delete-title">Excluir processo de teste</h2>
        <p>
          Exclusão permanente disponível somente no Jurisportal Internal para a conta mestre. Em escritórios de clientes,
          processos permanecem no histórico e só podem ser encerrados ou arquivados.
        </p>
      </div>

      {!confirming ? (
        <button type="button" className={styles.dangerButton} onClick={() => setConfirming(true)}>
          Excluir processo permanentemente
        </button>
      ) : (
        <div className={styles.deleteConfirm}>
          <strong>Excluir definitivamente {cnj}?</strong>
          <span>Partes, vínculos e eventos da linha do tempo deste processo também serão removidos.</span>
          {error ? <span className={styles.inlineError}>{error}</span> : null}
          <div className={styles.deleteConfirmActions}>
            <button disabled={busy} type="button" className={styles.secondaryButton} onClick={() => setConfirming(false)}>
              Cancelar
            </button>
            <button disabled={busy} type="button" className={styles.dangerButton} onClick={removePermanently}>
              {busy ? "Excluindo..." : "Sim, excluir permanentemente"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

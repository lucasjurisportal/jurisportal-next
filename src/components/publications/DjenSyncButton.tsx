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
  existingProcessIds: string[];
  processLookupRemaining: number;
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
  const [movementStatus, setMovementStatus] = useState("");
  const [movementNotices, setMovementNotices] = useState<Array<{ id: string; count: number; firstNewId: string | null }>>([]);

  async function sync() {
    setLoading(true);
    setMessage("");
    setError("");
    setMovementStatus("");
    setMovementNotices([]);
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
      // Exibir as publicações assim que o DJeN terminar; a consulta processual
      // é adicional e não deve bloquear a atualização dos contadores/tabelas.
      router.refresh();
      if (result.errors.length) {
        setMovementStatus("Movimentações não verificadas nesta tentativa porque a captura do DJeN ficou incompleta.");
        return;
      }
      // Segunda fase independente: falha do DataJud NÃO invalida a captura DJeN.
      const affected = [...new Set(result.existingProcessIds ?? [])];
      if (affected.length) {
        setMovementStatus(`Conferindo movimentações dos processos cadastrados...`);
        let failure = 0;
        let attempts = 0;
        let sourceStopped = false;
        let stopReason = "";
        let budgetReached = false;
        const movementStartedAt = Date.now();
        // O limite de tempo restringe só a verificação extra, não a captura DJeN.
        for (const id of affected.slice(0, 20)) {
          if (attempts > 0 && Date.now() - movementStartedAt >= 22_000) {
            budgetReached = true;
            break;
          }
          attempts++;
          setMovementStatus(`Conferindo movimentações: processo ${attempts} de ${affected.length}...`);
          try {
            const movementResponse = await fetch("/api/publications/sync-movements", {
              method: "POST", headers: { "content-type": "application/json" },
              body: JSON.stringify({ processId: id }),
            });
            const movement = await movementResponse.json() as { result?: { newMovements: number; firstNewId: string | null; truncated: boolean }; error?: string };
            if (!movementResponse.ok || !movement.result) {
              failure++;
              if (["PROCESS_LOOKUP_DISABLED", "PROCESS_LOOKUP_RATE_LIMIT", "PROCESS_LOOKUP_TIMEOUT",
                "PROCESS_LOOKUP_NETWORK_ERROR", "PROCESS_LOOKUP_SOURCE_UNAVAILABLE", "PROCESS_LOOKUP_AUTH_FAILED"].includes(movement.error ?? "")) {
                sourceStopped = true;
                stopReason = movement.error ?? "PROCESS_LOOKUP_SOURCE_UNAVAILABLE";
                break;
              }
              continue;
            }
            if (movement.result.newMovements) setMovementNotices(previous => [...previous,
              { id, count: movement.result!.newMovements, firstNewId: movement.result!.firstNewId }]);
            if (movement.result.truncated) failure++;
          } catch {
            failure++;
            sourceStopped = true;
            stopReason = "MOVEMENT_SYNC_NETWORK_ERROR";
            break;
          }
        }
        const remaining = result.processLookupRemaining + Math.max(0, affected.length - attempts);
        if (failure || remaining || sourceStopped || budgetReached) {
          const offline = stopReason === "PROCESS_LOOKUP_TIMEOUT"
            ? "O DataJud demorou a responder."
            : stopReason === "PROCESS_LOOKUP_RATE_LIMIT"
              ? "O DataJud limitou as consultas."
              : sourceStopped ? "A consulta processual está temporariamente indisponível." : "";
          setMovementStatus(`${offline} Movimentações: ${failure} consulta(s) sem conclusão${remaining ? `; ${remaining} processo(s) aguardam consulta` : ""}. As publicações e intimações foram preservadas.`);
        } else {
          setMovementStatus("Movimentações conferidas nos processos selecionados.");
        }
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
      {movementStatus ? <div role="status" className={styles.muted}>{movementStatus}</div> : null}
      {movementNotices.map(notice => <div className={styles.success} key={notice.id}>
        {notice.count} {notice.count === 1 ? "movimentação adicionada." : "movimentações adicionadas."} <a href={`/app/processos/${notice.id}?tab=movimentacoes${notice.firstNewId ? `#movimento-${notice.firstNewId}` : ""}`}>Saiba mais</a>
      </div>)}
    </div>
    <button className={styles.primaryButton} type="button" onClick={sync} disabled={loading}>{loading ? "Consultando..." : "Verificar manualmente"}</button>
  </div>;
}

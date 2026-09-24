"use client";
import { useState } from "react";
import styles from "./Processes.module.css";
type Movement = { id: string; code: number | null; name: string; occurredAt: string | null;
  judicialBody: string | null };
function movementDate(value: string | null) {
  if (!value) return "Data não informada";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}:${match[5]}` : value;
}
/** Leitura de dados gravados no escritório, sem obrigar nova requisição ao CNJ. */
export function ExternalProcessMovements({ processId, initialItems, lookupEnabled }: {
  processId: string; initialItems: Movement[]; lookupEnabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [items, setItems] = useState(initialItems);
  async function consult() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/processes/${encodeURIComponent(processId)}/external-movements`, { method: "POST", cache: "no-store" });
      const data = await response.json() as { items?: Movement[]; newMovements?: number; truncated?: boolean; error?: string };
      if (!response.ok) { setMessage(data.error === "PROCESS_LOOKUP_TIMEOUT"
        ? "A consulta ao DataJud terminou sem resposta HTTP. As publicações e movimentações já salvas continuam disponíveis."
        : "A consulta complementar não foi concluída. Os dados já salvos continuam disponíveis."); return; }
      setItems(data.items ?? []);
      setMessage(`${data.newMovements ?? 0} movimentação(ões) adicionada(s).${data.truncated ? " Foram preservados os 100 movimentos mais recentes da resposta; a consulta não equivale ao histórico integral." : ""}`);
    } catch { setMessage("Falha de conexão. Os dados já salvos continuam disponíveis."); }
    finally { setBusy(false); }
  }
  return <section className={styles.panel}>
    <div className={styles.processPanelHead}><div><span className={styles.eyebrow}>Dados do processo</span>
      <h2>Movimentações</h2><p>Histórico salvo no Jurisportal, sem confundir movimentos com intimações ou peças.</p></div>
      {lookupEnabled ? <button type="button" className={styles.secondaryButton} disabled={busy} onClick={consult}>
        {busy ? "Consultando..." : "Verificar movimentações"}</button> : null}
    </div>
    {busy ? <div className={styles.lookupProgress} role="status">Buscando movimentações...<div className={styles.lookupProgressTrack}><div className={styles.lookupProgressFill}/></div></div> : null}
    {message ? <p role="status" className={styles.muted}>{message}</p> : null}
    {items.length === 0 ? <p className={styles.muted}>Nenhuma movimentação salva para este processo.</p> :
      <div className={styles.timeline}>{items.map(item => <article className={styles.timelineItem} id={`movimento-${item.id}`} key={item.id}>
        <time>{movementDate(item.occurredAt)}</time><div><strong>{item.name}</strong>
          <span className={styles.muted}>{item.judicialBody || "Órgão não informado"}{item.code !== null ? ` · Código ${item.code}` : ""}</span>
        </div></article>)}</div>}
    <p className={styles.muted}>Movimentações dependem da atualização do tribunal no DataJud. Nenhum prazo é criado automaticamente.</p>
  </section>;
}

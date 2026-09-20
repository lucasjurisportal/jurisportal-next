"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Agenda.module.css";

type ProcessOption = { id: string; cnjFormatted: string; clients: { client: { name: string; tradeName: string | null } }[] };
type MemberOption = { user: { id: string; name: string } };

export function AgendaEventForm({ processes, members, defaultDate }: { processes: ProcessOption[]; members: MemberOption[]; defaultDate: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  if (!open) return <button className={styles.primaryButton} onClick={() => setOpen(true)}>+ Compromisso</button>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch("/api/agenda-events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: form.get("type"), title: form.get("title"), processId: form.get("processId"), responsibleUserId: form.get("responsibleUserId"), eventDate: form.get("eventDate"), startTime: form.get("startTime"), endTime: form.get("endTime"), notes: form.get("notes") }) });
    setLoading(false); if (!response.ok) { setError("Confira título, data e responsável."); return; } setOpen(false); router.refresh();
  }
  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.formTitle}><div><h2>Novo compromisso</h2><span className={styles.legend}>Use para audiência ou compromisso. Prazos e tarefas são criados no módulo próprio.</span></div><button type="button" onClick={() => setOpen(false)}>×</button></div>
    <div className={styles.grid2}>
      <div className={styles.field}><label>Tipo</label><select name="type"><option value="COMMITMENT">Compromisso</option><option value="HEARING">Audiência</option></select></div>
      <div className={styles.field}><label>Responsável</label><select name="responsibleUserId"><option value="">Sem responsável</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></div>
      <div className={`${styles.field} ${styles.span2}`}><label>Título</label><input name="title" required placeholder="Ex.: Audiência de conciliação" /></div>
      <div className={`${styles.field} ${styles.span2}`}><label>Processo opcional</label><select name="processId"><option value="">Sem processo vinculado</option>{processes.map((process) => <option key={process.id} value={process.id}>{process.cnjFormatted} · {process.clients[0]?.client.tradeName ?? process.clients[0]?.client.name ?? "Sem cliente principal"}</option>)}</select></div>
      <div className={styles.field}><label>Data</label><input name="eventDate" type="date" required defaultValue={defaultDate} /></div>
      <div className={styles.field}><label>Início</label><input name="startTime" type="time" /></div>
      <div className={styles.field}><label>Fim opcional</label><input name="endTime" type="time" /></div>
      <div className={`${styles.field} ${styles.span2}`}><label>Detalhes</label><textarea name="notes" /></div>
    </div>
    {error ? <div className={styles.error}>{error}</div> : null}
    <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Cancelar</button><button className={styles.primaryButton} disabled={loading}>{loading ? "Salvando..." : "Adicionar à Agenda"}</button></div>
  </form>;
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./WorkManagement.module.css";

type MemberOption = { user: { id: string; name: string } };

type Item = { id: string; kind: string; status: string; title: string; dueDate: string | null; dueTime: string | null; responsibleUserId: string | null; priority: string; notes: string | null };

export function GlobalWorkItemActions({ item, members }: { item: Item; members: MemberOption[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function changeStatus() {
    setBusy(true);
    const response = await fetch(`/api/work-items/${item.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: item.status === "DONE" ? "OPEN" : "DONE" }) });
    setBusy(false); if (response.ok) router.refresh();
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/work-items/${item.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: form.get("title"), dueDate: form.get("dueDate"), dueTime: form.get("dueTime"), responsibleUserId: form.get("responsibleUserId"), priority: form.get("priority"), notes: form.get("notes") }) });
    setBusy(false); if (!response.ok) { setError("Não foi possível atualizar a tarefa."); return; } setEditing(false); router.refresh();
  }

  return <div className={styles.actions}>
    {item.kind === "TASK" ? <button className={styles.rowButton} onClick={() => setEditing((v) => !v)}>{editing ? "Fechar" : "Editar"}</button> : null}
    <button className={styles.rowButton} disabled={busy} onClick={changeStatus}>{item.status === "DONE" ? "Reabrir" : "Concluir"}</button>
    {editing ? <form className={styles.editCard} onSubmit={save}>
      <div className={styles.field}><label>Título</label><input name="title" defaultValue={item.title} required /></div>
      <div className={styles.grid2}><div className={styles.field}><label>Data</label><input name="dueDate" type="date" defaultValue={item.dueDate ?? ""} /></div><div className={styles.field}><label>Horário</label><input name="dueTime" type="time" defaultValue={item.dueTime ?? ""} /></div></div>
      <div className={styles.grid2}><div className={styles.field}><label>Responsável</label><select name="responsibleUserId" defaultValue={item.responsibleUserId ?? ""}><option value="">Sem responsável</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></div><div className={styles.field}><label>Prioridade</label><select name="priority" defaultValue={item.priority}><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="LOW">Baixa</option></select></div></div>
      <div className={styles.field}><label>Observações</label><textarea name="notes" defaultValue={item.notes ?? ""} /></div>
      {error ? <div className={styles.error}>{error}</div> : null}<div className={styles.formActions}><button className={styles.primaryButton} disabled={busy}>Salvar tarefa</button></div>
    </form> : null}
  </div>;
}

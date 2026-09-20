"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./WorkManagement.module.css";

type ProcessOption = { id: string; cnjFormatted: string; subject: string | null; clients: { client: { name: string; tradeName: string | null } }[] };
type MemberOption = { user: { id: string; name: string; email: string } };

export function GlobalWorkItemForm({ processes, members, defaultProcessId = "" }: { processes: ProcessOption[]; members: MemberOption[]; defaultProcessId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"DEADLINE" | "TASK">("DEADLINE");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [processQuery, setProcessQuery] = useState("");
  const filteredProcesses = useMemo(() => {
    const q = processQuery.trim().toLowerCase();
    return processes.filter((process) => !q || `${process.cnjFormatted} ${process.subject ?? ""} ${process.clients[0]?.client.tradeName ?? process.clients[0]?.client.name ?? ""}`.toLowerCase().includes(q)).slice(0, 80);
  }, [processes, processQuery]);

  if (!open) return <button className={styles.primaryButton} onClick={() => setOpen(true)}>+ Novo prazo ou tarefa</button>;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/work-items", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
      processId: form.get("processId"), kind, title: form.get("title"), dueDate: form.get("dueDate"), dueTime: form.get("dueTime"), responsibleUserId: form.get("responsibleUserId"), priority: form.get("priority"), isFatal: kind === "DEADLINE" && form.get("isFatal") === "on", notes: form.get("notes"),
    }) });
    setLoading(false);
    if (!response.ok) { setError(kind === "DEADLINE" ? "Confira o processo, título e data do prazo." : "Confira os dados da tarefa."); return; }
    setOpen(false); router.refresh();
  }

  return <form className={styles.formCard} onSubmit={submit}>
    <div className={styles.formTitle}><div><h2>Novo item</h2><span className={styles.muted}>O mesmo registro aparecerá no processo, em Prazos e tarefas e, se tiver data, na Agenda.</span></div><button type="button" onClick={() => setOpen(false)}>×</button></div>
    <div className={styles.grid2}>
      <div className={styles.field}><label>Tipo</label><select value={kind} onChange={(e) => setKind(e.target.value as "DEADLINE" | "TASK")}><option value="DEADLINE">Prazo</option><option value="TASK">Tarefa</option></select></div>
      <div className={styles.field}><label>Filtrar processo</label><input value={processQuery} onChange={(e) => setProcessQuery(e.target.value)} placeholder="CNJ, assunto ou cliente" /></div>
      <div className={`${styles.field} ${styles.span2}`}><label>Processo</label><select name="processId" defaultValue={defaultProcessId} required><option value="">Selecione...</option>{filteredProcesses.map((process) => <option key={process.id} value={process.id}>{process.cnjFormatted} · {process.clients[0]?.client.tradeName ?? process.clients[0]?.client.name ?? process.subject ?? "Sem cliente principal"}</option>)}</select></div>
      <div className={`${styles.field} ${styles.span2}`}><label>Título</label><input name="title" required placeholder={kind === "DEADLINE" ? "Ex.: Apresentar manifestação" : "Ex.: Conferir documentos do cliente"} /></div>
      <div className={styles.field}><label>{kind === "DEADLINE" ? "Data do prazo" : "Data da tarefa"}</label><input name="dueDate" type="date" required={kind === "DEADLINE"} /><span className={styles.fieldHint}>Tarefa sem data fica em Prazos e tarefas, mas não aparece na Agenda.</span></div>
      <div className={styles.field}><label>Horário opcional</label><input name="dueTime" type="time" /></div>
      <div className={styles.field}><label>Responsável</label><select name="responsibleUserId"><option value="">Sem responsável</option>{members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></div>
      <div className={styles.field}><label>Prioridade</label><select name="priority"><option value="NORMAL">Normal</option><option value="HIGH">Alta</option><option value="LOW">Baixa</option></select></div>
      {kind === "DEADLINE" ? <label className={styles.checkbox}><input type="checkbox" name="isFatal" /> Prazo fatal</label> : null}
      <div className={`${styles.field} ${styles.span2}`}><label>Observações</label><textarea name="notes" /></div>
    </div>
    {error ? <div className={styles.error}>{error}</div> : null}
    <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Cancelar</button><button className={styles.primaryButton} disabled={loading}>{loading ? "Salvando..." : "Criar"}</button></div>
  </form>;
}

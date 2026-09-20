"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Processes.module.css";

type MemberOption = { id: string; name: string; email: string };

export function ProcessWorkItemForm({ processId, members }: { processId: string; members: MemberOption[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<"DEADLINE" | "TASK" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!kind) return;
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/processes/${processId}/work-items`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        kind,
        title: form.get("title"),
        dueDate: form.get("dueDate"),
        dueTime: form.get("dueTime"),
        responsibleUserId: form.get("responsibleUserId"),
        priority: form.get("priority"),
        isFatal: kind === "DEADLINE" && form.get("isFatal") === "on",
        notes: form.get("notes"),
      }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("Não foi possível criar o item.");
      return;
    }
    setKind(null);
    router.refresh();
  }

  if (!kind) {
    return <div className={styles.panelActionGroup}><button className={styles.secondaryButton} onClick={() => setKind("TASK")}>+ Tarefa</button><button className={styles.primaryButton} onClick={() => setKind("DEADLINE")}>+ Prazo</button></div>;
  }

  return (
    <form className={styles.inlineFormWide} onSubmit={submit}>
      <div className={styles.inlineFormTitle}><strong>{kind === "DEADLINE" ? "Novo prazo" : "Nova tarefa"}</strong><button type="button" onClick={() => setKind(null)}>×</button></div>
      <div className={styles.grid2}>
        <div className={`${styles.field} ${styles.span2}`}><label>Título</label><input name="title" required maxLength={180} /></div>
        <div className={styles.field}><label>Data</label><input name="dueDate" type="date" /></div>
        <div className={styles.field}><label>Horário</label><input name="dueTime" type="time" /></div>
        <div className={styles.field}><label>Responsável</label><select name="responsibleUserId" defaultValue=""><option value="">Não definido</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
        <div className={styles.field}><label>Prioridade</label><select name="priority" defaultValue="NORMAL"><option value="LOW">Baixa</option><option value="NORMAL">Normal</option><option value="HIGH">Alta</option></select></div>
        {kind === "DEADLINE" ? <label className={styles.checkboxLine}><input type="checkbox" name="isFatal" /> Prazo fatal</label> : null}
        <div className={`${styles.field} ${styles.span2}`}><label>Observações</label><textarea name="notes" maxLength={3000} /></div>
      </div>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.inlineFormActions}><button type="button" className={styles.secondaryButton} onClick={() => setKind(null)}>Cancelar</button><button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? "Salvando..." : "Salvar"}</button></div>
    </form>
  );
}

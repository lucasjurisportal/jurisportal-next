"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Publications.module.css";

type ProcessOption = { id: string; internalCode: string; cnjFormatted: string; subject: string | null; status: string };
type MemberOption = { user: { id: string; name: string } };

type Props = {
  publicationId: string;
  processId: string | null;
  reviewStatus: string | null;
  reviewTitle: string;
  suggestedDate: string;
  treated: boolean;
  processes: ProcessOption[];
  members: MemberOption[];
};

function errorMessage(code: string) {
  if (code === "PUBLICATION_PROCESS_REQUIRED") return "Vincule esta comunicação a um processo antes de criar prazo ou tarefa.";
  if (code === "DEADLINE_REVIEW_ALREADY_RESOLVED") return "A revisão de prazo desta comunicação já foi resolvida.";
  if (code === "PROCESS_NOT_FOUND") return "O processo selecionado não foi encontrado neste escritório.";
  if (code === "PUBLICATION_PROCESS_CNJ_MISMATCH") return "Esta comunicação informa um CNJ diferente do processo selecionado. Revise o número antes de vincular.";
  return code || "Não foi possível concluir a ação.";
}

export function PublicationActions(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function action(payload: Record<string, unknown>, key: string) {
    setBusy(key);
    setError("");
    try {
      const response = await fetch(`/api/publications/${props.publicationId}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error || "PUBLICATION_ACTION_FAILED");
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause instanceof Error ? cause.message : "PUBLICATION_ACTION_FAILED"));
    } finally {
      setBusy("");
    }
  }

  return <div className={styles.actions}>
    {error ? <div className={styles.error}>{error}</div> : null}

    {!props.processId ? <form className={styles.actionCard} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action({ action: "link-process", processId: form.get("processId") }, "link");
    }}>
      <h3>Vincular a um processo</h3>
      <p>O vínculo automático acontece quando o CNJ já existe. Se não aconteceu, selecione manualmente um processo deste escritório.</p>
      <div className={styles.field}><label>Processo</label><select name="processId" required defaultValue=""><option value="" disabled>Selecione...</option>{props.processes.map((process) => <option key={process.id} value={process.id}>{process.internalCode} · {process.cnjFormatted}{process.subject ? ` · ${process.subject}` : ""}</option>)}</select></div>
      <div className={styles.formActions}><button className={styles.primaryButton} disabled={busy === "link"}>{busy === "link" ? "Vinculando..." : "Vincular processo"}</button></div>
    </form> : null}

    {props.reviewStatus === "PENDING_REVIEW" ? <form className={styles.actionCard} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action({ action: "confirm-deadline", title: form.get("title"), dueDate: form.get("dueDate") }, "deadline");
    }}>
      <h3>Revisar prazo</h3>
      <p>A data só vira prazo do Jurisportal depois da sua confirmação. Data expressa é informação auxiliar, não decisão jurídica automática.</p>
      <div className={styles.field}><label>Título</label><input name="title" defaultValue={props.reviewTitle} required /></div>
      <div className={styles.field}><label>Data confirmada</label><input name="dueDate" type="date" defaultValue={props.suggestedDate} required /></div>
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={busy === "deadline" || !props.processId}>{busy === "deadline" ? "Confirmando..." : "Confirmar prazo"}</button>
        <button className={styles.secondaryButton} type="button" disabled={busy === "dismiss"} onClick={() => void action({ action: "dismiss-deadline" }, "dismiss")}>{busy === "dismiss" ? "Descartando..." : "Não gera prazo"}</button>
      </div>
    </form> : null}

    <form className={styles.actionCard} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action({
        action: "create-task",
        title: form.get("title"),
        dueDate: form.get("dueDate"),
        responsibleUserId: form.get("responsibleUserId"),
      }, "task");
    }}>
      <h3>Criar tarefa</h3>
      <p>Cria a mesma tarefa usada pelo módulo Prazos e tarefas. Se tiver data, também aparece na Agenda.</p>
      <div className={styles.field}><label>Título</label><input name="title" placeholder="Ex.: Conferir documentos citados na intimação" required /></div>
      <div className={styles.grid2}>
        <div className={styles.field}><label>Data opcional</label><input name="dueDate" type="date" /></div>
        <div className={styles.field}><label>Responsável</label><select name="responsibleUserId" defaultValue=""><option value="">Usar responsável do processo/OAB</option>{props.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select></div>
      </div>
      <div className={styles.formActions}><button className={styles.primaryButton} disabled={busy === "task" || !props.processId}>{busy === "task" ? "Criando..." : "Criar tarefa"}</button></div>
    </form>

    {!props.treated ? <div className={styles.actionCard}>
      <h3>Tratamento da comunicação</h3>
      <p>Use quando a publicação já tiver sido conferida e as ações necessárias tiverem sido tomadas.</p>
      <div className={styles.formActions}><button className={styles.secondaryButton} type="button" disabled={busy === "treated"} onClick={() => void action({ action: "mark-treated" }, "treated")}>{busy === "treated" ? "Salvando..." : "Marcar como tratada"}</button></div>
    </div> : null}
  </div>;
}

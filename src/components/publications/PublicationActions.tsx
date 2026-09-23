"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Publications.module.css";

type ProcessOption = { id: string; internalCode: string; cnjFormatted: string; subject: string | null; status: string };
type MemberOption = { user: { id: string; name: string } };

type Props = {
  publicationId: string;
  processNumberNormalized: string | null;
  processId: string | null;
  reviewStatus: string | null;
  reviewTitle: string;
  suggestedDate: string;
  treated: boolean;
  processes: ProcessOption[];
  members: MemberOption[];
};

function errorMessage(code: string) {
  if (code === "PUBLICATION_DEADLINE_REVIEW_REQUIRED") return "Confira o prazo ou escolha Não gera prazo antes de concluir a comunicação.";
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
      <h3>Este processo ainda não está cadastrado</h3>
      {props.processNumberNormalized?.length === 20 ? <div className={styles.formActions}>
        <a className={styles.primaryButton} href={`/app/processos/novo?publicationId=${encodeURIComponent(props.publicationId)}`}>
          Criar processo com os dados da publicação
        </a>
      </div> : <p>O número CNJ não está completo. Confira a comunicação antes de criar o processo.</p>}
      <h3>Vincular a processo existente</h3>
      <p>Se o processo já estiver cadastrado, selecione-o. O Jurisportal confere o número CNJ antes de vincular.</p>
      <div className={styles.field}><label>Processo</label><select name="processId" required defaultValue=""><option value="" disabled>Selecione...</option>{props.processes.map((process) => <option key={process.id} value={process.id}>{process.internalCode} · {process.cnjFormatted}{process.subject ? ` · ${process.subject}` : ""}</option>)}</select></div>
      <div className={styles.formActions}><button className={styles.primaryButton} disabled={busy === "link"}>{busy === "link" ? "Vinculando..." : "Vincular processo"}</button></div>
    </form> : null}

    {props.reviewStatus === "PENDING_REVIEW" ? <form className={styles.actionCard} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      void action({ action: "confirm-deadline", title: form.get("title"), dueDate: form.get("dueDate") }, "deadline");
    }}>
      <h3>Criar prazo?</h3>
      <p>A data só vira prazo do Jurisportal depois da sua confirmação. Data expressa é informação auxiliar, não decisão jurídica automática.</p>
      <div className={styles.field}><label>Título</label><input name="title" defaultValue={props.reviewTitle} required /></div>
      <div className={styles.field}><label>Data confirmada</label><input name="dueDate" type="date" defaultValue={props.suggestedDate} required /></div>
      <div className={styles.formActions}>
        <button className={styles.primaryButton} disabled={busy === "deadline" || !props.processId}>{busy === "deadline" ? "Confirmando..." : "Criar prazo"}</button>
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
      <h3>Concluir atendimento</h3>
      <p>A comunicação permanece na lista de pendentes até você concluí-la. Se houver prazo, confirme-o ou escolha Não gera prazo antes de concluir.</p>
      <div className={styles.formActions}><button className={styles.secondaryButton} type="button" disabled={busy === "treated"} onClick={() => void action({ action: "mark-treated" }, "treated")}>{busy === "treated" ? "Salvando..." : "Concluir"}</button></div>
    </div> : null}
  </div>;
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PetitionTemplates.module.css";

type Props = {
  templateId: string;
  templateName: string;
  returnToLibrary?: boolean;
};

const messages: Record<string, string> = {
  PETITION_TEMPLATE_DELETE_FORBIDDEN: "Somente o proprietário ou quem criou este modelo pode excluí-lo permanentemente.",
  PETITION_TEMPLATE_NOT_FOUND: "Este modelo não existe mais ou não pertence ao escritório.",
  AUTH_REQUIRED: "Sua sessão expirou. Entre novamente antes de excluir o modelo.",
  SECOND_FACTOR_REQUIRED: "Confirme a verificação de acesso antes de excluir o modelo.",
  RECOVERY_REQUIRED: "Conclua a recuperação de acesso antes de excluir o modelo.",
};

/** Exclusão intencional de uma base reutilizável, sem apagar as peças já geradas. */
export function PetitionTemplateDeleteButton({ templateId, templateName, returnToLibrary = false }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    if (busy) return;
    setOpen(false);
    setConfirmation("");
    setError("");
  }

  async function remove() {
    if (busy || confirmation.trim().toUpperCase() !== "EXCLUIR") return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/petition-templates/${encodeURIComponent(templateId)}`, {
        method: "DELETE",
        cache: "no-store",
      });
      if (!response.ok) {
        const payload: unknown = await response.json().catch(() => null);
        const code = typeof payload === "object" && payload !== null && "error" in payload
          ? (payload as { error?: unknown }).error : null;
        setError(typeof code === "string" && code in messages ? messages[code] : "Não foi possível excluir o modelo. Tente novamente.");
        return;
      }
      setOpen(false);
      setConfirmation("");
      if (returnToLibrary) router.replace("/app/modelos?origin=OFFICE");
      router.refresh();
    } catch {
      setError("Falha de conexão. O modelo não foi confirmado como excluído. Verifique sua conexão e tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button
      type="button"
      className={styles.dangerButton}
      onClick={() => { setConfirmation(""); setError(""); setOpen(true); }}
    >Excluir permanentemente</button>
    {open ? <div className={styles.deleteBackdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) close();
    }}>
      <div className={styles.deleteDialog} role="alertdialog" aria-modal="true"
        aria-labelledby={`delete-title-${templateId}`} aria-describedby={`delete-description-${templateId}`}
        onKeyDown={(event) => { if (event.key === "Escape") close(); }}>
        <h2 id={`delete-title-${templateId}`}>Excluir modelo permanentemente?</h2>
        <p id={`delete-description-${templateId}`}>Você está prestes a excluir <strong>{templateName}</strong> e todas as versões desse modelo. Esta ação não poderá ser desfeita.</p>
        <p>As petições já geradas e os PDFs anexados aos processos <strong>não serão apagados</strong>.</p>
        <label className={styles.deleteConfirmLabel} htmlFor={`delete-confirm-${templateId}`}>
          Digite <strong>EXCLUIR</strong> para confirmar:
        </label>
        <input id={`delete-confirm-${templateId}`} className={styles.deleteConfirmInput}
          value={confirmation} onChange={(event) => setConfirmation(event.target.value)}
          disabled={busy} autoComplete="off" autoFocus />
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.deleteDialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={close} disabled={busy}>Cancelar</button>
          <button type="button" className={styles.dangerButton} onClick={remove}
            disabled={busy || confirmation.trim().toUpperCase() !== "EXCLUIR"}>
            {busy ? "Excluindo..." : "Excluir definitivamente"}
          </button>
        </div>
      </div>
    </div> : null}
  </>;
}

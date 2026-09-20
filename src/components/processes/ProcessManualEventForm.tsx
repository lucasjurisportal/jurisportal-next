"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Processes.module.css";

export function ProcessManualEventForm({ processId }: { processId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/processes/${processId}/timeline`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: form.get("title"), description: form.get("description") }),
    });
    setLoading(false);
    if (!response.ok) {
      setError("Não foi possível registrar o evento.");
      return;
    }
    setOpen(false);
    event.currentTarget.reset();
    router.refresh();
  }

  if (!open) return <button className={styles.secondaryButton} onClick={() => setOpen(true)}>+ Evento manual</button>;

  return (
    <form className={styles.inlineForm} onSubmit={submit}>
      <div className={styles.field}><label>Título</label><input name="title" required maxLength={160} placeholder="Ex.: Cliente enviou documentação" /></div>
      <div className={styles.field}><label>Descrição</label><textarea name="description" maxLength={3000} placeholder="Contexto opcional" /></div>
      {error ? <div className={styles.error}>{error}</div> : null}
      <div className={styles.inlineFormActions}>
        <button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Cancelar</button>
        <button type="submit" className={styles.primaryButton} disabled={loading}>{loading ? "Salvando..." : "Registrar"}</button>
      </div>
    </form>
  );
}

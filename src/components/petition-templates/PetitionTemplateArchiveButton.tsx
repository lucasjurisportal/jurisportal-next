"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PetitionTemplates.module.css";
export function PetitionTemplateArchiveButton({ templateId, archived }: { templateId: string; archived: boolean }) {
  const router = useRouter(); const [busy,setBusy]=useState(false);
  async function run(){ setBusy(true); try { const response=await fetch(`/api/petition-templates/${templateId}`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({archived:!archived})}); if(response.ok){router.refresh();} } finally {setBusy(false);} }
  return <button type="button" className={archived ? styles.secondaryButton : styles.dangerButton} disabled={busy} onClick={run}>{busy?"Salvando...":archived?"Restaurar modelo":"Arquivar modelo"}</button>;
}

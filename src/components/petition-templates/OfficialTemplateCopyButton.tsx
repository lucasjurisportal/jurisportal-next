"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./PetitionTemplates.module.css";
export function OfficialTemplateCopyButton({ name, category, scope, content }: { name: string; category: string; scope: string; content: string }) {
  const router=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function copy(){ setBusy(true); setError(""); try { const normalizedScope=scope==="Cliente"?"CLIENT":scope==="Processo"?"PROCESS":"GENERAL"; const response=await fetch("/api/petition-templates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:`${name} - cópia`,category,scope:normalizedScope,content})}); const data=await response.json().catch(()=>({})) as {template?:{id?:string}}; if(!response.ok||!data.template?.id){setError("Não foi possível criar a cópia."); return;} router.push(`/app/modelos/${data.template.id}`); router.refresh(); } finally {setBusy(false);} }
  return <div><button type="button" className={styles.secondaryButton} disabled={busy} onClick={copy}>{busy?"Criando cópia...":"Criar cópia editável"}</button>{error?<div className={styles.error}>{error}</div>:null}</div>;
}

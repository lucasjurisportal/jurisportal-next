"use client";

import { FormEvent, useRef, useState } from "react";
import { PetitionPaperEditor, type PetitionPaperHandle } from "./PetitionPaperEditor";
import { decodeRichDocument, richToPlain } from "@/modules/petition-templates/domain/rich-document";
import { useRouter } from "next/navigation";
import { PETITION_TEMPLATE_VARIABLES } from "@/modules/petition-templates/domain/template-variables";
import styles from "./PetitionTemplates.module.css";

type InitialValue = { id?: string; name: string; category: string; scope: "CLIENT" | "PROCESS" | "GENERAL"; content: string };

export function PetitionTemplateForm({ initialValue }: { initialValue?: InitialValue }) {
  const router = useRouter();
  const paperRef = useRef<PetitionPaperHandle>(null);
  const [paperReset, setPaperReset] = useState(0);
  const [value, setValue] = useState<InitialValue>(initialValue ?? { name: "", category: "", scope: "PROCESS", content: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [importNotice, setImportNotice] = useState("");

  function insertVariable(token: string) {
    paperRef.current?.insertText(token);
  }

  async function importFile(file: File | null) {
    if (!file) return;
    setError(""); setImportNotice(""); setImportBusy(true);
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/petition-templates/import", { method: "POST", body: form });
      const data = await response.json().catch(() => ({})) as { error?: string; content?: string; warnings?: string[]; fileName?: string };
      if (!response.ok || !data.content) {
        const labels: Record<string,string> = { UNSUPPORTED_TEMPLATE_FILE: "Use um arquivo DOCX ou TXT.", TXT_TOO_LARGE: "O TXT excede 1 MB.", DOCX_TOO_LARGE: "O DOCX excede 5 MB.", DOCX_INVALID_ZIP: "O DOCX está inválido ou corrompido.", DOCX_CONTENT_TOO_LARGE: "O conteúdo interno do DOCX é grande demais.", IMPORTED_TEMPLATE_EMPTY: "O arquivo não contém texto editável." };
        setError(labels[data.error ?? ""] ?? "Não foi possível importar o modelo."); return;
      }
      const baseName = (data.fileName ?? file.name).replace(/\.(docx|txt)$/i, "");
      setValue((current) => ({ ...current, name: current.name || baseName, content: data.content ?? current.content }));
      setImportNotice(["Conteúdo importado para revisão antes de salvar.", ...(data.warnings ?? [])].join(" "));
      setPaperReset((number) => number + 1);
    } catch {
      setError("Falha de conexão ao importar o documento. Tente novamente.");
    } finally { setImportBusy(false); }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (richToPlain(decodeRichDocument(value.content)).trim().length < 20) {
      setError("O modelo precisa de pelo menos 20 caracteres de conteúdo."); return;
    }
    setError(""); setBusy(true);
    try {
      const response = await fetch(initialValue?.id ? `/api/petition-templates/${initialValue.id}` : "/api/petition-templates", {
        method: initialValue?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await response.json().catch(() => ({})) as { error?: string; template?: { id?: string } };
      if (!response.ok) {
        setError(data.error === "INVALID_PETITION_TEMPLATE" ? "Revise os campos do modelo antes de salvar." : "Não foi possível salvar o modelo.");
        return;
      }
      const id = data.template?.id ?? initialValue?.id;
      router.push(id ? `/app/modelos/${id}` : "/app/modelos");
      router.refresh();
    } catch {
      setError("Falha de conexão ao salvar o modelo. Revise sua conexão e tente novamente.");
    } finally { setBusy(false); }
  }

  return <form className={styles.form} onSubmit={submit}>
    {error ? <div className={styles.error}>{error}</div> : null}
    {importNotice ? <div className={styles.notice}>{importNotice}</div> : null}
    {!initialValue?.id ? <div className={styles.importBox}><div><strong>Importar modelo próprio</strong><small>DOCX ou TXT. O arquivo vira texto editável e só é salvo depois da sua revisão.</small></div><label className={styles.secondaryButton}>{importBusy ? "Importando..." : "Selecionar arquivo"}<input type="file" accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden disabled={importBusy} onChange={(e) => { void importFile(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} /></label></div> : null}
    <div className={styles.grid2}>
      <div className={styles.field}><label>Nome do modelo</label><input value={value.name} onChange={(e) => setValue({ ...value, name: e.target.value })} maxLength={160} placeholder="Ex.: Manifestação de juntada" /></div>
      <div className={styles.field}><label>Categoria</label><input value={value.category} onChange={(e) => setValue({ ...value, category: e.target.value })} maxLength={80} placeholder="Ex.: Petições simples" /></div>
      <div className={styles.field}><label>Escopo de uso</label><select value={value.scope} onChange={(e) => setValue({ ...value, scope: e.target.value as InitialValue["scope"] })}><option value="PROCESS">Processo</option><option value="CLIENT">Cliente</option><option value="GENERAL">Geral</option></select></div>
    </div>
    <div className={styles.field}>
      <label>Variáveis disponíveis</label>
      <small>Clique para inserir no ponto atual do texto. Os dados só são preenchidos ao gerar o rascunho.</small>
      <div className={styles.variables}>{PETITION_TEMPLATE_VARIABLES.map(([token, label]) => <button className={styles.variableButton} type="button" key={token} title={label} onMouseDown={(e) => e.preventDefault()} onClick={() => insertVariable(token)}>{token}</button>)}</div>
    </div>
    <div className={styles.field}><label>Conteúdo do modelo, em folha A4 editável</label>
      <PetitionPaperEditor ref={paperRef} content={value.content} resetKey={paperReset} label="Editar modelo reutilizável"
        onChange={(content) => setValue((current) => ({ ...current, content }))} />
      <small>Insira variáveis com os botões acima. Negrito, itálico, sublinhado, título e alinhamento são preservados na petição gerada e no PDF.</small>
    </div>
    <div className={styles.actions}><button className={styles.primaryButton} disabled={busy}>{busy ? "Salvando..." : initialValue?.id ? "Salvar nova versão" : "Criar modelo"}</button></div>
  </form>;
}

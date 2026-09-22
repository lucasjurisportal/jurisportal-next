"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PetitionPaperEditor } from "./PetitionPaperEditor";
import { decodeRichDocument, richToPlain } from "@/modules/petition-templates/domain/rich-document";
import styles from "./PetitionTemplates.module.css";

type ProcessOption = { id: string; internalCode: string; cnjFormatted: string; subject: string | null; clients: { client: { id: string; name: string; tradeName: string | null } }[] };
type ClientOption = { id: string; name: string; tradeName: string | null; taxIdRaw: string };
type ApiFailure = { error?: string };
const labels: Record<string, string> = {
  PETITION_CLIENT_NOT_LINKED_TO_PROCESS: "O cliente não está vinculado ao processo escolhido.",
  PROCESS_NOT_FOUND: "O processo não foi encontrado neste escritório.",
  CLIENT_NOT_FOUND: "O cliente não foi encontrado neste escritório.",
  PETITION_PROCESS_REQUIRED: "Selecione um processo e gere novamente o documento antes de anexar.",
  STORAGE_QUOTA_EXCEEDED: "O escritório atingiu o limite de armazenamento do plano.",
  R2_NOT_CONFIGURED: "O armazenamento de documentos ainda não está disponível. Contate o suporte.",
  INVALID_FINAL_CONTENT: "Revise o documento; ele pode estar vazio ou exceder o limite de texto.",
};
async function failure(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({})) as ApiFailure;
  return labels[data.error ?? ""] ?? fallback;
}
function clientLabel(client: ClientOption) { return client.tradeName || client.name; }

export function PetitionDraftGenerator({ source, templateId, officialSlug, processes, clients }: {
  source: "OFFICIAL" | "OFFICE"; templateId?: string; officialSlug?: string;
  processes: ProcessOption[]; clients: ClientOption[];
}) {
  const [clientId, setClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientFocus, setClientFocus] = useState(false);
  const [remoteClients, setRemoteClients] = useState<ClientOption[]>([]);
  const [remoteProcesses, setRemoteProcesses] = useState<ProcessOption[]>([]);
  const [processId, setProcessId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState("");
  const [plain, setPlain] = useState("");
  const [unresolved, setUnresolved] = useState<string[]>([]);
  const [generationId, setGenerationId] = useState("");
  const [documentKey, setDocumentKey] = useState(0);
  const [saveState, setSaveState] = useState<"" | "saving" | "saved">("");
  const [exporting, setExporting] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [savingToProcess, setSavingToProcess] = useState(false);
  const [savedProcessId, setSavedProcessId] = useState("");
  const previewUrlRef = useRef("");
  const selectedClient = [...clients, ...remoteClients].find((client) => client.id === clientId);
  const matchingProcesses = useMemo(() => {
    const pool = [...remoteProcesses, ...processes];
    return pool.filter((process, index) => pool.findIndex((item) => item.id === process.id) === index)
      .filter((process) => !clientId || process.clients.some((link) => link.client.id === clientId));
  }, [clientId, processes, remoteProcesses]);
  const localSuggestions = useMemo(() => {
    const query = clientQuery.trim().toLocaleLowerCase("pt-BR");
    if (query.length < 2) return [];
    return [...clients, ...remoteClients].filter((client, index, list) => list.findIndex((item) => item.id === client.id) === index)
      .filter((client) => `${client.name} ${client.tradeName ?? ""} ${client.taxIdRaw}`.toLocaleLowerCase("pt-BR").includes(query)).slice(0, 12);
  }, [clients, remoteClients, clientQuery]);

  useEffect(() => {
    if (clientQuery.trim().length < 2 || clientId) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/petition-templates/lookup-clients?q=${encodeURIComponent(clientQuery.trim())}`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json() as { clients?: ClientOption[] };
        if (!controller.signal.aborted) setRemoteClients(data.clients ?? []);
      } catch { /* Busca auxiliar: ainda mostramos resultados locais. */ }
    }, 280);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [clientQuery, clientId]);
  useEffect(() => {
    if (!clientId) { return; }
    const controller = new AbortController();
    void fetch(`/api/petition-templates/lookup-processes?clientId=${encodeURIComponent(clientId)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ processes: ProcessOption[] }> : { processes: [] })
      .then((data) => { if (!controller.signal.aborted) setRemoteProcesses(data.processes); })
      .catch(() => { /* A lista local continua disponível. */ });
    return () => controller.abort();
  }, [clientId]);
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  function invalidateDraft() {
    setContent(""); setPlain(""); setGenerationId(""); setUnresolved([]); setSavedProcessId("");
    setNotice(""); setSaveState(""); closePreview();
  }
  function closePreview() {
    setPreviewUrl("");
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = ""; }
  }
  function chooseClient(client: ClientOption) {
    if (generationId && saveState !== "saved" && !window.confirm("Alterar o cliente descarta o rascunho atual não salvo. Deseja continuar?")) return;
    if (generationId) invalidateDraft();
    setRemoteProcesses([]);
    setClientId(client.id); setClientQuery(clientLabel(client)); setClientFocus(false);
    if (processId && !processes.find((p) => p.id === processId)?.clients.some((link) => link.client.id === client.id)) setProcessId("");
  }
  function chooseProcess(value: string) {
    if (generationId && saveState !== "saved" && !window.confirm("Alterar o processo descarta o rascunho atual não salvo. Deseja continuar?")) return;
    if (generationId) invalidateDraft();
    setProcessId(value);
    const process = matchingProcesses.find((item) => item.id === value);
    if (process?.clients.length && !process.clients.some((link) => link.client.id === clientId)) {
      const primary = process.clients[0].client;
      setClientId(primary.id); setClientQuery(primary.tradeName || primary.name);
    }
  }
  async function generate() {
    if (clientQuery.trim() && !clientId) {
      setError("Selecione o cliente na lista de resultados antes de gerar o documento."); return;
    }
    setBusy(true); setError(""); setNotice(""); closePreview();
    try {
      const response = await fetch("/api/petition-templates/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ source, templateId, officialSlug, processId: processId || null, clientId: clientId || null }) });
      if (!response.ok) { setError(await failure(response, "Não foi possível criar o documento. Tente novamente.")); return; }
      const data = await response.json() as { renderedContent: string; unresolvedVariables: string[]; generation: { id: string } };
      const text = richToPlain(decodeRichDocument(data.renderedContent));
      setContent(data.renderedContent); setPlain(text); setGenerationId(data.generation.id); setUnresolved(data.unresolvedVariables ?? []);
      setDocumentKey((number) => number + 1); setSaveState(""); setSavedProcessId("");
      setNotice("Rascunho gerado. Confira os dados preenchidos e revise a petição antes de salvar ou exportar.");
    } catch { setError("Falha de conexão ao gerar o documento. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!generationId || !plain.trim()) return;
    setSaveState("saving"); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/petition-templates/generations/${generationId}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
      if (!response.ok) { setSaveState(""); setError(await failure(response, "Não foi possível salvar sua revisão. Tente novamente.")); return; }
      setSaveState("saved"); setNotice("Revisão salva.");
    } catch { setSaveState(""); setError("Falha de conexão ao salvar a revisão."); }
  }
  async function pdfRequest(preview: boolean) {
    if (!generationId || !plain.trim()) return;
    preview ? setPreviewBusy(true) : setExporting(true);
    setError(""); setNotice("");
    try {
      const url = `/api/petition-templates/generations/${generationId}/${preview ? "preview-pdf" : "export-pdf"}`;
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }) });
      if (!response.ok) { setError(await failure(response, "Não foi possível gerar o PDF. Tente novamente.")); return; }
      const blobUrl = URL.createObjectURL(await response.blob());
      if (preview) {
        closePreview(); previewUrlRef.current = blobUrl; setPreviewUrl(blobUrl);
      } else {
        const disposition = response.headers.get("content-disposition") ?? "";
        const fileName = disposition.match(/filename="([^"]+)"/)?.[1] ?? "peticao.pdf";
        const anchor = document.createElement("a"); anchor.href = blobUrl; anchor.download = fileName;
        document.body.appendChild(anchor); anchor.click(); anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        setSaveState("saved"); setNotice("PDF gerado e baixado. Confira o arquivo antes do uso jurídico.");
      }
    } catch { setError("Não foi possível conectar ao servidor para gerar o PDF."); }
    finally { preview ? setPreviewBusy(false) : setExporting(false); }
  }
  async function savePdfToProcess() {
    if (!generationId || !plain.trim() || !processId) return;
    setSavingToProcess(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/petition-templates/generations/${generationId}/save-in-process`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content }),
      });
      if (!response.ok) { setError(await failure(response, "Não foi possível anexar o PDF ao processo. Tente novamente.")); return; }
      const result = await response.json() as { processId: string };
      setSaveState("saved"); setSavedProcessId(result.processId);
      setNotice("PDF salvo nos documentos do processo. Confira o arquivo na aba Documentos.");
    } catch { setError("Falha de conexão ao anexar o PDF ao processo."); }
    finally { setSavingToProcess(false); }
  }
  const operationBusy = busy || exporting || previewBusy || savingToProcess || saveState === "saving";
  return <section className={styles.generator}>
    <header><span className={styles.eyebrow}>Criar documento</span><h2>Preencher, editar e finalizar</h2>
      <p>Comece pelo cliente. O Jurisportal utiliza os dados cadastrados e, quando houver processo vinculado, preenche também as variáveis processuais disponíveis.</p></header>
    {error ? <p role="alert" className={styles.error}>{error}</p> : null}
    {notice ? <p role="status" className={styles.success}>{notice}</p> : null}
    <div className={styles.generatorGrid}>
      <div className={styles.field}>
        <label htmlFor="petition-client-search">1. Cliente</label>
        <input id="petition-client-search" autoComplete="off" value={clientQuery} placeholder="Digite nome, CPF ou CNPJ..."
          disabled={busy} onFocus={() => setClientFocus(true)} onBlur={() => window.setTimeout(() => setClientFocus(false), 160)}
          onChange={(event) => { if (generationId) invalidateDraft(); setClientQuery(event.target.value); setClientId(""); setProcessId(""); setRemoteProcesses([]); setClientFocus(true); }} />
        {clientFocus && clientQuery.trim().length > 1 && !clientId ? <div className={styles.lookupResults} role="listbox" aria-label="Clientes encontrados">
          {localSuggestions.length ? localSuggestions.map((client) => <button type="button" role="option" aria-selected={false} key={client.id} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseClient(client)}>
            <strong>{clientLabel(client)}</strong><small>{client.taxIdRaw}</small>
          </button>) : <span>Nenhum resultado encontrado na lista. Continue digitando para buscar no escritório.</span>}
        </div> : null}
        {selectedClient ? <small className={styles.selectedHint}>Selecionado: {clientLabel(selectedClient)}</small> : <small>Opcional para documentos gerais; selecione para preenchimento automático.</small>}
      </div>
      <div className={styles.field}>
        <label htmlFor="petition-process">2. Processo vinculado</label>
        <select id="petition-process" value={processId} onChange={(event) => chooseProcess(event.target.value)} disabled={busy}>
          <option value="">Sem processo (somente cliente ou documento geral)</option>
          {matchingProcesses.map((process) => <option key={process.id} value={process.id}>{process.internalCode} · {process.cnjFormatted} · {process.subject || "Sem assunto"}</option>)}
        </select>
        <small>{clientId ? "Exibindo processos vinculados ao cliente selecionado." : "Selecionar o processo preenche o cliente principal, quando disponível."}</small>
      </div>
    </div>
    <div className={styles.actions}><button type="button" className={styles.primaryButton} disabled={busy || operationBusy} onClick={generate}>{busy ? "Preparando o documento..." : generationId ? "Gerar novamente com os dados selecionados" : "Criar documento editável"}</button></div>
    {unresolved.length ? <div className={styles.notice}><strong>Dados ainda não preenchidos:</strong><ul className={styles.warningList}>{unresolved.map((token) => <li key={token}>{token}</li>)}</ul><p>Complete esses campos na folha antes de exportar.</p></div> : null}
    {generationId ? <div className={styles.documentWorkArea}>
      <div className={styles.documentActionBar}>
        <div><strong>Documento em elaboração</strong><span>{saveState === "saved" ? "Revisão salva" : "Revise e salve antes de sair"}</span></div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} disabled={operationBusy || !plain.trim()} onClick={save}>{saveState === "saving" ? "Salvando..." : "Salvar revisão"}</button>
          <button type="button" className={styles.secondaryButton} disabled={operationBusy || !plain.trim()} onClick={() => void pdfRequest(true)}>{previewBusy ? "Preparando prévia..." : "Visualizar PDF"}</button>
          <button type="button" className={styles.primaryButton} disabled={operationBusy || !plain.trim()} onClick={() => void pdfRequest(false)}>{exporting ? "Gerando PDF..." : "Baixar PDF"}</button>
          <button type="button" className={styles.secondaryButton} disabled={operationBusy || !plain.trim() || !processId} onClick={savePdfToProcess} title={!processId ? "Selecione um processo antes de gerar o documento" : "Salvar PDF no R2 e vinculá-lo ao processo"}>{savingToProcess ? "Anexando..." : "Anexar ao processo"}</button>
          <button type="button" className={styles.secondaryButton} disabled title="Disponível após a implementação de Comunicação e autorização do advogado">Enviar ao cliente · em breve</button>
        </div>
      </div>
      <PetitionPaperEditor content={content} resetKey={documentKey} label="Editar petição gerada" onChange={(serialized, text) => { setContent(serialized); setPlain(text); setSaveState(""); setSavedProcessId(""); setNotice(""); }} />
      <p className={styles.paperFootnote}>O advogado deve conferir os dados, o texto jurídico e a prévia final. O envio ao cliente será habilitado no bloco Comunicação, sem prometer uma função que ainda não existe.</p>
      {savedProcessId ? <a className={styles.secondaryButton} href={`/app/processos/${savedProcessId}?tab=documentos`}>Abrir documentos do processo</a> : null}
    </div> : null}
    {previewUrl ? <div className={styles.pdfPreviewOverlay} role="dialog" aria-modal="true" aria-label="Prévia do PDF">
      <div className={styles.pdfPreviewBox}>
        <div className={styles.pdfPreviewHead}><strong>Prévia real do PDF A4</strong><button type="button" className={styles.secondaryButton} onClick={closePreview}>Fechar prévia</button></div>
        <iframe title="Prévia da petição em PDF" src={previewUrl} />
      </div>
    </div> : null}
  </section>;
}

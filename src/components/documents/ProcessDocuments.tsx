"use client";

import { useEffect, useRef, useState } from "react";
import { unzip, zip } from "fflate";
import { inspectZipArchive, ZIP_DOWNLOAD_MAX_BYTES, ZIP_MAX_COMPRESSED_BYTES } from "@/modules/documents/domain/zip-policy";
import styles from "./ProcessDocuments.module.css";

type Doc = {
  id: string; displayName: string; sizeBytes: number; status: string; source: string;
  createdAt: string; deletedAt: string | null; uploadedBy: { name: string } | null; backupStatus: string;
};
type DocumentList = {
  documents: Doc[];
  storage: { usedBytes: number; reservedBytes: number; limitBytes: number };
  permanentDeletionEnabled: boolean;
};
type UploadState = "waiting" | "preparing" | "sending" | "verifying" | "done" | "error";
type UploadItem = { id: number; name: string; progress: number; state: UploadState; error?: string };
type MessageKind = "info" | "success" | "error";
type Preview = { id: string; name: string; url: string; sizeBytes: number };

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const mb = (bytes: number) => `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
const reasons: Record<string, string> = {
  AUTH_REQUIRED: "Sua sessão expirou. Entre novamente no Jurisportal antes de continuar.",
  PROCESS_NOT_FOUND: "Este processo não foi encontrado ou você não tem acesso a ele.",
  DOCUMENT_NOT_FOUND: "Este documento não está disponível neste processo.",
  DOCUMENT_UPLOAD_FORBIDDEN: "A confirmação deve ser feita pelo usuário que iniciou o envio.",
  DOCUMENT_NOT_PENDING: "Este envio não está mais pendente. Atualize a lista antes de tentar novamente.",
  DOCUMENT_NOT_FOUND_OR_INVALID_STATUS: "O documento mudou de situação. Atualize a lista e tente novamente.",
  INVALID_DOCUMENT: "Não foi possível identificar as informações do arquivo. Selecione o PDF novamente.",
  R2_NOT_CONFIGURED: "O armazenamento ainda não foi configurado. Contate o suporte.",
  PDF_TOO_LARGE_OR_EMPTY: "O PDF deve ter até 50 MB e não pode estar vazio.",
  PDF_NAME_INVALID: "Selecione um arquivo com extensão .pdf.",
  STORAGE_QUOTA_EXCEEDED: "O escritório não possui espaço disponível para esse documento.",
  UPLOAD_NOT_FINISHED: "O armazenamento ainda não recebeu o arquivo. Verifique sua conexão e tente novamente.",
  UPLOAD_EXPIRED: "A autorização de envio expirou. Selecione o documento novamente.",
  PDF_INVALID: "O arquivo enviado não é um PDF válido. Confira o arquivo original.",
  PDF_SIGNATURE_UNVERIFIED: "Não foi possível verificar o PDF. Tente novamente.",
  PDF_SIZE_EXCEEDS_RESERVATION: "O arquivo recebido excedeu o tamanho autorizado. Selecione-o novamente.",
  DOCUMENT_RECOVERY_EXPIRED: "O período de recuperação de 30 dias terminou.",
  DOCUMENT_SOURCE_MISSING: "O PDF não está disponível no armazenamento. O suporte deve verificar a recuperação antes de reativá-lo.",
  DOCUMENT_OPERATION_FAILED: "O servidor não conseguiu concluir a operação. Tente novamente em alguns instantes.",
  DOCUMENT_COMPLETION_FAILED: "Não foi possível confirmar o documento no sistema. Atualize a lista antes de tentar reenviar.",
  OWNER_REQUIRED: "Apenas o proprietário pode excluir definitivamente documentos.",
  DOCUMENT_PURGE_DISABLED: "Exclusão definitiva será liberada após os backups serem testados.",
  DOCUMENT_PURGE_PENDING: "O documento foi marcado para eliminação. O armazenamento será atualizado após a limpeza automática.",
  DOCUMENT_PURGE_REQUIRES_DELETED: "Primeiro mova este documento para recuperação e atualize a lista.",
  DOCUMENT_BACKUP_NOT_VERIFIED: "Aguarde a confirmação da cópia de segurança antes de excluir definitivamente.",
};

async function jsonOrFail(response: Response): Promise<Record<string, unknown>> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body && typeof body === "object" && "error" in body ? String(body.error) : "";
    throw new Error(reasons[code] ||
      (response.status >= 500
        ? "O servidor está indisponível no momento. Tente novamente em alguns instantes."
        : `Operação não concluída (${code || response.status}).`));
  }
  if (!body || typeof body !== "object") throw new Error("Resposta inesperada do servidor. Atualize a página e tente novamente.");
  return body as Record<string, unknown>;
}

async function requestJson(url: string, options?: RequestInit): Promise<Record<string, unknown>> {
  try {
    return await jsonOrFail(await fetch(url, options));
  } catch (error) {
    if (error instanceof TypeError) throw new Error(
      "Não foi possível conectar ao Jurisportal. Confira sua conexão e tente novamente.",
    );
    throw error;
  }
}

/** fetch não expõe o progresso de upload. XHR disponibiliza os bytes efetivamente transmitidos. */
function sendPdfToR2(uploadUrl: string, file: File, onProgress: (percent: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.timeout = 10 * 60_000;
    xhr.setRequestHeader("Content-Type", "application/pdf");
    xhr.setRequestHeader("If-None-Match", "*");
    xhr.upload.onprogress = (event: ProgressEvent<EventTarget>) => {
      const total = event.lengthComputable && event.total > 0 ? event.total : file.size;
      onProgress(Math.min(100, Math.round(100 * event.loaded / total)));
    };
    xhr.onerror = () => reject(new Error(
      "Falha de conexão com o armazenamento. Verifique a internet e a configuração de CORS do R2 antes de tentar novamente.",
    ));
    xhr.ontimeout = () => reject(new Error(
      "O envio demorou mais do que o permitido. Confira sua conexão e selecione o arquivo novamente.",
    ));
    xhr.onabort = () => reject(new Error("O envio foi interrompido antes da conclusão."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { onProgress(100); resolve(); return; }
      const description = xhr.status === 403
        ? "A autorização do Cloudflare expirou ou foi recusada. Selecione o arquivo novamente e confira a configuração do R2."
        : xhr.status === 412
          ? "O arquivo já existe no armazenamento com essa autorização. Selecione-o novamente."
          : xhr.status === 413
            ? "O armazenamento recusou o tamanho do arquivo. Confira o limite de 50 MB."
            : xhr.status >= 500
              ? "O Cloudflare está indisponível no momento. Tente novamente em alguns instantes."
              : `O Cloudflare recusou o arquivo (código ${xhr.status}). Tente novamente.`;
      reject(new Error(description));
    };
    xhr.send(file);
  });
}

const uploadLabels: Record<UploadState, string> = {
  waiting: "Aguardando envio",
  preparing: "Verificando espaço e autorização",
  sending: "Enviando ao armazenamento",
  verifying: "Upload concluído; verificando e registrando o PDF",
  done: "Enviado e confirmado",
  error: "Não enviado",
};

export function ProcessDocuments({ processId, canManage, initial }: {
  processId: string; canManage: boolean; initial: DocumentList;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<MessageKind>("info");
  const [showDeleted, setShowDeleted] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState("");
  const previewUrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef(0);
  const previewSectionRef = useRef<HTMLElement | null>(null);
  const picker = useRef<HTMLInputElement>(null);
  const zipPicker = useRef<HTMLInputElement>(null);
  const base = `/api/processes/${processId}/documents`;

  useEffect(() => {
    if (!uploading) return;
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeLeave);
    return () => window.removeEventListener("beforeunload", warnBeforeLeave);
  }, [uploading]);

  // O navegador recebe somente o PDF autorizado; a URL assinada nunca é colocada no iframe.
  // O Blob permanece válido enquanto o visor está aberto, sendo liberado ao fechar ou sair da página.
  useEffect(() => () => {
    previewRequestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
  }, []);

  useEffect(() => {
    if (preview) previewSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [preview]);

  function closePreview() {
    previewRequestRef.current += 1;
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreview(null);
    setPreviewLoading(null);
    setPreviewError("");
  }

  async function openPreview(documentId: string, name: string, sizeBytes: number) {
    closePreview();
    const request = ++previewRequestRef.current;
    setPreviewLoading(documentId);
    setPreviewError("");
    try {
      const details = await requestJson(`${base}/${documentId}/download`, { cache: "no-store" });
      const response = await fetch(String(details.url), { cache: "no-store", referrerPolicy: "no-referrer" });
      if (!response.ok) throw new Error(response.status === 403
        ? "O acesso temporário ao PDF expirou. Clique em Visualizar novamente."
        : "Não foi possível carregar o PDF do armazenamento. Confira sua conexão e tente novamente.");
      const blob = await response.blob();
      // Uma resposta de erro inesperada do fornecedor não pode ser exibida como documento.
      const signature = new TextDecoder("ascii").decode(await blob.slice(0, 5).arrayBuffer());
      if (!blob.size || signature !== "%PDF-") throw new Error("O armazenamento não retornou um PDF válido.");
      const url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      if (request !== previewRequestRef.current) { URL.revokeObjectURL(url); return; }
      previewUrlRef.current = url;
      setPreview({ id: documentId, name, sizeBytes, url });
    } catch (error) {
      if (request !== previewRequestRef.current) return;
      const description = error instanceof TypeError
        ? "Não foi possível abrir a prévia. Confira sua conexão e o CORS GET do R2. O download continua disponível."
        : error instanceof Error ? error.message : "Falha inesperada ao abrir o PDF.";
      setPreviewError(description);
    } finally {
      if (request === previewRequestRef.current) setPreviewLoading(null);
    }
  }

  function notify(kind: MessageKind, text: string) { setMessageKind(kind); setMessage(text); }
  function updateItem(id: number, patch: Partial<UploadItem>) {
    setQueue((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }
  async function refresh() {
    const result = await requestJson(base, { cache: "no-store" });
    setData(result as unknown as DocumentList);
  }

  async function uploadFiles(selected: File[]) {
    if (!selected.length || busy) return;
    setBusy(true);
    setUploading(true);
    setQueue(selected.map((file, id) => ({ id, name: file.name, state: "waiting", progress: 0 })));
    notify("info", `Preparando ${selected.length} arquivo(s). Não feche esta página até o envio terminar.`);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const [id, file] of selected.entries()) {
        try {
          if (!file.name.toLowerCase().endsWith(".pdf") || file.size > MAX_PDF_BYTES || file.size <= 0) {
            throw new Error(`Arquivo não aceito: ${file.name}. Envie PDFs de até 50 MB.`);
          }
          updateItem(id, { state: "preparing", progress: 0 });
          const init = await requestJson(base, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: file.name, sizeBytes: file.size }),
          });
          updateItem(id, { state: "sending", progress: 0 });
          await sendPdfToR2(String(init.uploadUrl), file, (percent) => {
            updateItem(id, { state: "sending", progress: percent });
          });
          updateItem(id, { state: "verifying", progress: 100 });
          await requestJson(`${base}/${String(init.id)}/complete`, { method: "POST" });
          updateItem(id, { state: "done", progress: 100 });
          succeeded++;
        } catch (error) {
          failed++;
          const description = error instanceof Error ? error.message : "Falha inesperada no envio.";
          updateItem(id, { state: "error", error: description });
        }
      }
      try {
        await refresh();
        notify(failed ? "error" : "success", failed
          ? `${succeeded} documento(s) enviado(s); ${failed} não concluído(s). Veja o motivo em cada arquivo abaixo.`
          : `${succeeded} documento(s) enviado(s) e confirmado(s) com sucesso.`);
      } catch {
        notify("error", `${succeeded} documento(s) confirmado(s), mas não foi possível atualizar a lista. Recarregue a página para conferir antes de reenviar.`);
      }
    } finally {
      setUploading(false);
      setBusy(false);
      if (picker.current) picker.current.value = "";
      if (zipPicker.current) zipPicker.current.value = "";
    }
  }

  async function uploadZip(archive: File | undefined) {
    if (!archive || busy) return;
    if (!archive.name.toLowerCase().endsWith(".zip") || archive.size > ZIP_MAX_COMPRESSED_BYTES || !archive.size) {
      notify("error", "Selecione um ZIP válido de até 100 MB contendo apenas documentos PDF.");
      if (zipPicker.current) zipPicker.current.value = "";
      return;
    }
    setBusy(true);
    notify("info", "Conferindo o ZIP antes de extrair. Isso pode levar alguns instantes...");
    try {
      const buffer = new Uint8Array(await archive.arrayBuffer());
      const entries = inspectZipArchive(buffer); // Pré-valida tamanhos declarados antes de descompactar.
      const extracted = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(buffer, (error, files) => error ? reject(error) : resolve(files));
      });
      const filenames = new Set<string>();
      const files = entries.map((entry) => {
        const contents = extracted[entry.name];
        if (!contents || contents.byteLength !== entry.uncompressed || contents.byteLength > MAX_PDF_BYTES ||
            new TextDecoder("ascii").decode(contents.subarray(0, 5)) !== "%PDF-") {
          throw new Error(`O arquivo ${entry.name} não é um PDF válido ou tem tamanho divergente. Nenhum arquivo deste ZIP foi enviado.`);
        }
        const baseName = entry.name.replace(/\\/g, "/").split("/").pop() || "documento.pdf";
        const stem = baseName.slice(0, -4).slice(0, 135);
        let name = `${stem}.pdf`;
        let suffix = 2;
        while (filenames.has(name.toLocaleLowerCase("en-US"))) name = `${stem} (${suffix++}).pdf`;
        filenames.add(name.toLocaleLowerCase("en-US"));
        return new File([new Uint8Array(contents).buffer as ArrayBuffer], name, { type: "application/pdf" });
      });
      notify("info", `ZIP conferido: ${files.length} PDF(s). Iniciando o envio individual e seguro...`);
      // A função chamada parte da mesma interação e gerencia busy durante toda a fila.
      await uploadFiles(files);
    } catch (error) {
      const description = error instanceof Error ? error.message : "Não foi possível extrair o ZIP.";
      setQueue([{ id: 0, name: archive.name, state: "error", progress: 0, error: description }]);
      notify("error", description);
    } finally {
      setBusy(false);
      if (zipPicker.current) zipPicker.current.value = "";
    }
  }

  async function downloadAll() {
    const active = data.documents.filter((doc) => doc.status === "ACTIVE");
    if (!active.length || busy) return;
    if (active.reduce((sum, doc) => sum + doc.sizeBytes, 0) > ZIP_DOWNLOAD_MAX_BYTES) {
      notify("error", "O conjunto ultrapassa 200 MB. Para evitar travar o navegador, baixe os PDFs individualmente nesta versão.");
      return;
    }
    setBusy(true); notify("info", `Preparando ZIP com ${active.length} PDF(s). Aguarde...`);
    try {
      const downloaded: Record<string, Uint8Array> = {};
      const names = new Set<string>();
      for (const [index, doc] of active.entries()) {
        notify("info", `Baixando documento ${index + 1} de ${active.length}: ${doc.displayName}`);
        const details = await requestJson(`${base}/${doc.id}/download`, { cache: "no-store" });
        const response = await fetch(String(details.url), { cache: "no-store", referrerPolicy: "no-referrer" });
        if (!response.ok) throw new Error(`Não foi possível baixar ${doc.displayName}. Nenhum ZIP incompleto será entregue.`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (bytes.byteLength !== doc.sizeBytes || new TextDecoder("ascii").decode(bytes.subarray(0, 5)) !== "%PDF-") {
          throw new Error(`O arquivo ${doc.displayName} está incompleto. Tente novamente.`);
        }
        const stem = doc.displayName.replace(/[\\/\x00-\x1f]/g, "-").replace(/\.pdf$/i, "").slice(0, 130) || "documento";
        let name = `${stem}.pdf`, n = 2;
        while (names.has(name.toLocaleLowerCase("en-US"))) name = `${stem} (${n++}).pdf`;
        names.add(name.toLocaleLowerCase("en-US"));
        downloaded[name] = bytes;
      }
      notify("info", "Todos os PDFs foram baixados. Montando o ZIP...");
      const archive = await new Promise<Uint8Array>((resolve, reject) => {
        zip(downloaded, { level: 0 }, (error, value) => error ? reject(error) : resolve(value));
      });
      const url = URL.createObjectURL(new Blob([new Uint8Array(archive).buffer as ArrayBuffer], { type: "application/zip" }));
      const link = document.createElement("a"); link.href = url;
      link.download = `documentos-processo-${processId.slice(0, 8)}.zip`;
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
      notify("success", `ZIP com ${active.length} PDF(s) preparado com sucesso.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível preparar o ZIP.");
    } finally { setBusy(false); }
  }

  async function purge(documentId: string, name: string) {
    if (!data.permanentDeletionEnabled || busy) return;
    const typed = window.prompt(`Excluir definitivamente "${name}"?\n\nO arquivo não poderá mais ser restaurado pela interface. Para confirmar, digite EXCLUIR:`);
    if (typed !== "EXCLUIR") return;
    setBusy(true); notify("info", "Removendo o arquivo do armazenamento...");
    try {
      await requestJson(`${base}/${documentId}/purge`, { method: "POST" });
      await refresh();
      notify("success", "Documento eliminado do armazenamento ativo. O espaço foi atualizado.");
    } catch (error) {
      await refresh().catch(() => undefined);
      notify("error", error instanceof Error ? error.message : "Falha na exclusão definitiva.");
    } finally { setBusy(false); }
  }

  async function download(documentId: string) {
    setBusy(true); notify("info", "Preparando o download...");
    try {
      const details = await requestJson(`${base}/${documentId}/download`, { cache: "no-store" });
      const response = await fetch(String(details.url));
      if (!response.ok) throw new Error("Não foi possível recuperar o PDF no Cloudflare R2.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = String(details.name);
      document.body.append(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      notify("success", "Download preparado com sucesso.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Falha no download.");
    } finally { setBusy(false); }
  }

  async function status(documentId: string, action: "delete" | "restore") {
    if (action === "delete" && !window.confirm("Mover este documento para recuperação por 30 dias?")) return;
    if (action === "delete" && preview?.id === documentId) closePreview();
    setBusy(true); notify("info", "Atualizando documento...");
    try {
      await requestJson(`${base}/${documentId}`, { method: action === "delete" ? "DELETE" : "PATCH" });
      await refresh();
      notify("success", action === "delete"
        ? "Documento excluído. Recuperação disponível por 30 dias."
        : "Documento recuperado.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível alterar o documento.");
    } finally { setBusy(false); }
  }

  const total = data.storage.usedBytes + data.storage.reservedBytes;
  const percent = data.storage.limitBytes ? Math.min(100, Math.round(100 * total / data.storage.limitBytes)) : 100;
  const shown = data.documents.filter((doc) => showDeleted || doc.status === "ACTIVE");
  return <div className={styles.wrapper}>
    <div className={styles.usage}>
      <strong>{mb(total)} de {mb(data.storage.limitBytes)} utilizados</strong>
      <span>O espaço de documentos em recuperação continua reservado até a eliminação definitiva.</span>
      <progress max={100} value={percent} aria-label="Armazenamento utilizado" />
      {percent >= 80 ? <span>{percent >= 100
        ? "Espaço esgotado. Os downloads continuam disponíveis."
        : "O espaço do escritório está próximo do limite."}</span> : null}
    </div>
    <div className={styles.actions}>
      <label className={styles.upload} aria-disabled={busy}>Enviar PDFs
        <input ref={picker} aria-label="Selecionar documentos PDF" type="file" accept=".pdf,application/pdf" multiple
          disabled={busy} onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))} />
      </label>
      <span className={styles.uploadLimit} role="note">Somente PDF · até <strong>50 MB por arquivo</strong> · é possível selecionar vários arquivos.</span>
      <label className={styles.upload} aria-disabled={busy}>Enviar ZIP com PDFs
        <input ref={zipPicker} aria-label="Selecionar arquivo ZIP" type="file" accept=".zip,application/zip"
          disabled={busy} onChange={(event) => void uploadZip(event.target.files?.[0])} />
      </label>
      <span className={styles.uploadLimit}>ZIP até 100 MB · máximo de 200 PDFs · até 500 MB descompactados. O envio pode demorar.</span>
      <button className={styles.downloadAll} type="button" disabled={busy || !data.documents.some((doc) => doc.status === "ACTIVE")}
        onClick={() => void downloadAll()}>Baixar todos como ZIP (até 200 MB)</button>
      <label className={styles.toggle}>
        <input type="checkbox" checked={showDeleted} onChange={(event) => setShowDeleted(event.target.checked)} />
        Ver documentos em recuperação
      </label>
    </div>
    {queue.length > 0 ? <section className={styles.queue} aria-label="Progresso dos documentos">
      <strong>Envio de documentos</strong>
      {uploading ? <p className={styles.hint}>Aguarde a confirmação. Não feche nem atualize esta página durante o envio.</p> : null}
      <div className={styles.queueList}>{queue.map((item) => <div className={styles.queueItem} key={item.id}>
        <div className={styles.queueHeading}>
          <span className={styles.fileName}>{item.name}</span>
          <span className={item.state === "error" ? styles.failed : item.state === "done" ? styles.completed : ""}>
            {uploadLabels[item.state]}{item.state === "sending" ? ` · ${item.progress}%` : ""}
          </span>
        </div>
        <progress max={100} value={item.progress} aria-label={`Envio de ${item.name}`} />
        {item.error ? <p role="alert" className={styles.failed}>{item.error}</p> : null}
      </div>)}</div>
    </section> : null}
    {message ? <p className={`${styles.message} ${messageKind === "error" ? styles.errorMessage : messageKind === "success" ? styles.successMessage : ""}`}
      role={messageKind === "error" ? "alert" : "status"}>{message}</p> : null}
    {shown.length === 0 ? <p className={styles.empty}>Nenhum documento {showDeleted ? "registrado" : "ativo"} neste processo.</p> :
      <div className={styles.list}>{shown.map((doc) => <article key={doc.id} className={styles.item}>
        <div className={styles.info}>
          <strong>{doc.displayName}</strong>
          <span>{mb(doc.sizeBytes)} · {new Date(doc.createdAt).toLocaleDateString("pt-BR")} · {doc.uploadedBy?.name || "Sistema"}</span>
          <span title="A cópia de segurança é separada do arquivo usado no processo.">
            {doc.backupStatus === "VERIFIED" ? "Cópia de segurança verificada" :
              doc.backupStatus === "ACKNOWLEDGED_MISSING" ? "Arquivo ausente nos dois buckets; perda reconhecida manualmente no ambiente de testes" :
              doc.backupStatus === "FAILED" ? "Cópia de segurança com falha; o Jurisportal tentará novamente" :
              "Cópia de segurança aguardando confirmação"}
          </span>
          {doc.status === "DELETED" ? <span>Em recuperação desde {doc.deletedAt
            ? new Date(doc.deletedAt).toLocaleDateString("pt-BR") : "data não disponível"}</span> : null}
        </div>
        <div className={styles.itemActions}>
          {doc.status === "ACTIVE" ? <button disabled={busy || previewLoading !== null} type="button"
            onClick={() => void openPreview(doc.id, doc.displayName, doc.sizeBytes)}>
            {previewLoading === doc.id ? "Abrindo PDF..." : "Visualizar"}
          </button> : null}
          {doc.status === "ACTIVE" ? <button disabled={busy} type="button" onClick={() => void download(doc.id)}>Baixar</button> : null}
          {canManage ? <button disabled={busy} type="button"
            onClick={() => void status(doc.id, doc.status === "ACTIVE" ? "delete" : "restore")}>
            {doc.status === "ACTIVE" ? "Excluir" : "Restaurar"}
          </button> : null}
          {canManage && doc.status === "DELETED" ? <button disabled={busy || !data.permanentDeletionEnabled}
            title={!data.permanentDeletionEnabled ? "Disponível após testar os backups" : "Remoção irreversível do armazenamento ativo"}
            type="button" onClick={() => void purge(doc.id, doc.displayName)}>Excluir definitivamente</button> : null}
        </div>
      </article>)}</div>}
    {previewLoading && !preview ? <p className={styles.previewStatus} role="status">Preparando a visualização do PDF. Aguarde...</p> : null}
    {previewError ? <p className={styles.errorMessage} role="alert">{previewError}</p> : null}
    {preview ? <section ref={previewSectionRef} className={styles.preview} aria-label={`Visualização de ${preview.name}`}>
      <div className={styles.previewHeader}>
        <div className={styles.previewTitle}>
          <strong>{preview.name}</strong>
          <span>{mb(preview.sizeBytes)} · prévia privada no Jurisportal</span>
        </div>
        <div className={styles.itemActions}>
          <button type="button" disabled={busy} onClick={() => void download(preview.id)}>Baixar</button>
          <button type="button" onClick={closePreview} aria-label="Fechar visualização do PDF">Fechar visualização</button>
        </div>
      </div>
      <div className={styles.previewLayout}>
        <div className={styles.pdfArea}>
          <iframe src={preview.url} title={`PDF: ${preview.name}`} referrerPolicy="no-referrer"
            className={styles.pdfFrame} />
          <p className={styles.previewHint}>A navegação e o zoom usam o visualizador de PDF do seu navegador. Se não abrir, utilize Baixar.</p>
        </div>
        <aside className={styles.aiSidebar} aria-label="Ferramentas de IA jurídica em preparação">
          <div className={styles.aiHeading}><strong>Assistente jurídico</strong><span>Em preparação</span></div>
          <p className={styles.aiBubble}>Esta área terá ações jurídicas prontas, sem campo de conversa livre.</p>
          <div className={styles.aiActions}>
            <button type="button" disabled title="Disponível após a implementação de IA e créditos">Resumir documento</button>
            <button type="button" disabled title="Exigirá visualizador com identificação exata da página">Resumir página</button>
            <button type="button" disabled title="Disponível após a implementação de IA e créditos">Extrair datas e valores</button>
            <button type="button" disabled title="Disponível após a implementação de IA e créditos">Identificar pontos importantes</button>
          </div>
          <p className={styles.aiHint}>A IA ainda não está ativa nesta versão. Nenhum PDF é enviado à OpenAI pela visualização. Para resumir uma página, a próxima etapa usará um leitor com página identificada, não apenas o visualizador nativo do navegador.</p>
        </aside>
      </div>
    </section> : null}
    <p className={styles.note}>Nesta etapa: PDF individual, ZIP com PDFs e download em lote limitado a 200 MB. Exclusão definitiva só será habilitada após teste dos backups. A IA será integrada em etapa posterior.</p>
  </div>;
}

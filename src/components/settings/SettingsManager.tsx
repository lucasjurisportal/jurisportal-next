"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./Settings.module.css";
import { APP_THEMES, DEFAULT_APP_THEME, THEME_EVENT, themeStorageKey, validAppTheme, type AppTheme } from "@/modules/appearance/domain/theme";

type SettingsData = {
  user: { id: string; name: string; email: string };
  office: { name: string; logo: string | null; legalName: string; taxId: string; adminEmail: string; whatsapp: string; postalCode: string; street: string; number: string; complement: string; district: string; city: string; state: string };
  notifications: { publicationsEmail: boolean; publicationsWhatsapp: boolean; deadlinesEmail: boolean; deadlinesWhatsapp: boolean; syncFailureEmail: boolean; syncFailureWhatsapp: boolean; dailyOwnerReportEmail: boolean };
  oabs: Array<{ id: string; rawNumber: string; state: string; isPrimary: boolean; userId: string; userName: string; userEmail: string }>;
  activeSessions: number;
};

type Preview = {
  kind: "clients" | "processes";
  fileName: string;
  headers: string[];
  mapping: Record<string, string>;
  fields: Array<{ key: string; label: string; required: boolean; help?: string }>;
  totalRows: number;
  readyRows: number;
  duplicateRows: number;
  invalidRows: number;
  limitRows: number;
  previewRows: Array<{ rowNumber: number; status: "ready" | "duplicate" | "invalid" | "limit"; label: string; values: Record<string, string>; errors: string[] }>;
};

type Props = {
  initial: SettingsData;
  initialTab?: string;
  isOwner: boolean;
  planName: string;
  oabLimit: number;
  processLimit: number | "unlimited";
  clientLimit: number | "unlimited";
};

const UF = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const SUPPORT_TOPICS = ["Problema no sistema", "Dúvida de uso", "Publicações e intimações", "Processos", "Clientes", "Prazos e tarefas", "Equipe", "Importação de dados", "Conta e acesso", "Plano e cobrança", "Outro"];

function errorLabel(code: string) {
  if (code.includes("IMPORT_FILE_TOO_LARGE")) return "O arquivo excede 4 MB.";
  if (code.includes("IMPORT_TOO_MANY_ROWS")) return "O arquivo possui mais de 1.000 linhas. Divida-o em arquivos menores.";
  if (code.includes("IMPORT_UNSUPPORTED_FILE")) return "Use um arquivo CSV ou XLSX.";
  if (code.includes("IMPORT_EMPTY_FILE")) return "O arquivo não possui dados para importar.";
  if (code.includes("IMPORT_DUPLICATE_HEADER")) return "A planilha possui títulos de coluna repetidos.";
  if (code.includes("CSV_UNCLOSED_QUOTE")) return "O CSV contém aspas abertas ou malformadas.";
  return "Não foi possível processar o arquivo. Confira o conteúdo e tente novamente.";
}

async function jsonRequest(url: string, method: string, body?: unknown) {
  const response = await fetch(url, { method, headers: body ? { "content-type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "REQUEST_FAILED");
  return payload;
}

export function SettingsManager({ initial, initialTab, isOwner, planName, oabLimit, processLimit, clientLimit }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab || "conta");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState({ name: initial.user.name });
  const [office, setOffice] = useState({ officeName: initial.office.name, legalName: initial.office.legalName, taxId: initial.office.taxId, adminEmail: initial.office.adminEmail, whatsapp: initial.office.whatsapp, postalCode: initial.office.postalCode, street: initial.office.street, number: initial.office.number, complement: initial.office.complement, district: initial.office.district, city: initial.office.city, state: initial.office.state });
  const [notifications, setNotifications] = useState(initial.notifications);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fontScale, setFontScale] = useState("1");
  const [theme, setTheme] = useState<AppTheme>(DEFAULT_APP_THEME);
  const [supportTopic, setSupportTopic] = useState(SUPPORT_TOPICS[0]);
  const [supportOther, setSupportOther] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [cepMessage, setCepMessage] = useState("");
  const [importKind, setImportKind] = useState<"clients" | "processes">("clients");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("jp-font-scale") || "1";
    setFontScale(saved);
    document.documentElement.style.fontSize = `${Number(saved) * 100}%`;
    try { setTheme(validAppTheme(window.localStorage.getItem(themeStorageKey(initial.user.id)))); }
    catch { setTheme(DEFAULT_APP_THEME); }
  }, [initial.user.id]);

  const tabs = useMemo(() => [
    ["conta", "Conta e acesso"],
    ...(isOwner ? [["escritorio", "Escritório"], ["oabs", "OABs e monitoramento"], ["notificacoes", "Notificações"], ["importacao", "Importar dados"]] : []),
    ["seguranca", "Segurança"],
    ["acessibilidade", "Acessibilidade"],
    ["suporte", "Suporte"],
  ] as Array<[string, string]>, [isOwner]);

  useEffect(() => {
    if (!tabs.some(([key]) => key === tab)) setTab("conta");
  }, [tab, tabs]);

  function flash(text: string) { setMessage(text); window.setTimeout(() => setMessage(""), 3500); }

  async function saveAccount(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await jsonRequest("/api/settings/account", "PATCH", account); flash("Dados da conta atualizados."); router.refresh(); }
    catch { flash("Não foi possível salvar os dados da conta."); }
    finally { setBusy(false); }
  }

  async function saveOffice(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try { await jsonRequest("/api/settings/office", "PATCH", office); flash("Dados do escritório atualizados."); router.refresh(); }
    catch { flash("Confira os campos do escritório e tente novamente."); }
    finally { setBusy(false); }
  }

  async function lookupOfficeCep() {
    const cep = office.postalCode.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepMessage("Consultando CEP...");
    try {
      const response = await fetch(`/api/cep/${cep}`);
      if (!response.ok) { setCepMessage("CEP não encontrado. Confira o endereço."); return; }
      const data = await response.json() as { street?: string; district?: string; city?: string; state?: string };
      setOffice((current) => ({ ...current, street: data.street || current.street, district: data.district || current.district, city: data.city || current.city, state: data.state || current.state }));
      setCepMessage("Endereço encontrado. Confira antes de salvar.");
    } catch { setCepMessage("Não foi possível consultar o CEP agora."); }
  }

  async function saveNotifications() {
    setBusy(true);
    try { await jsonRequest("/api/settings/notifications", "PATCH", notifications); flash("Preferências de notificação atualizadas."); }
    catch { flash("Não foi possível salvar as notificações."); }
    finally { setBusy(false); }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword !== confirmPassword) { flash("A confirmação da nova senha não confere."); return; }
    setBusy(true);
    try { await jsonRequest("/api/settings/password", "POST", { currentPassword, newPassword }); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); flash("Senha alterada. As outras sessões foram encerradas."); }
    catch { flash("Não foi possível alterar a senha. Confira a senha atual."); }
    finally { setBusy(false); }
  }

  async function revokeSessions() {
    setBusy(true);
    try { const result = await jsonRequest("/api/settings/sessions/others", "DELETE"); flash(`${result.revoked ?? 0} outra(s) sessão(ões) encerrada(s).`); router.refresh(); }
    catch { flash("Não foi possível encerrar as outras sessões."); }
    finally { setBusy(false); }
  }

  async function sendSupport(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    try {
      await jsonRequest("/api/settings/support", "POST", { topic: supportTopic, otherTopic: supportOther, message: supportMessage });
      setSupportMessage(""); setSupportOther(""); flash("Solicitação enviada. O prazo médio de resposta é de até 48 horas.");
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      flash(code.includes("NOT_CONFIGURED") ? "O canal de suporte ainda precisa ser configurado pelo Jurisportal." : "Não foi possível enviar a solicitação agora.");
    } finally { setBusy(false); }
  }

  function applyTheme(next: AppTheme) {
    setTheme(next);
    try { window.localStorage.setItem(themeStorageKey(initial.user.id), next); }
    catch { flash("Neste navegador, não foi possível guardar a preferência de cor."); }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  function applyFontScale(scale: string) {
    setFontScale(scale); window.localStorage.setItem("jp-font-scale", scale); document.documentElement.style.fontSize = `${Number(scale) * 100}%`;
  }

  async function runPreview(nextMapping?: Record<string, string>) {
    if (!file) return;
    setImportBusy(true); setImportError(""); setImportResult("");
    try {
      const form = new FormData(); form.set("file", file); form.set("kind", importKind);
      const map = nextMapping ?? mapping;
      if (Object.keys(map).length) form.set("mapping", JSON.stringify(map));
      const response = await fetch("/api/imports/preview", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "IMPORT_PREVIEW_FAILED");
      setPreview(payload.preview); setMapping(payload.preview.mapping);
    } catch (error) { setPreview(null); setImportError(errorLabel(error instanceof Error ? error.message : "")); }
    finally { setImportBusy(false); }
  }

  async function commitImport() {
    if (!file || !preview || preview.readyRows === 0) return;
    setImportBusy(true); setImportError("");
    try {
      const form = new FormData(); form.set("file", file); form.set("kind", importKind); form.set("mapping", JSON.stringify(mapping));
      const response = await fetch("/api/imports/commit", { method: "POST", body: form });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "IMPORT_COMMIT_FAILED");
      setImportResult(`${payload.result.imported} registro(s) importado(s). ${payload.result.failedDuringCommit ? `${payload.result.failedDuringCommit} não puderam ser gravados.` : ""}`);
      await runPreview(mapping); router.refresh();
    } catch (error) { setImportError(errorLabel(error instanceof Error ? error.message : "")); }
    finally { setImportBusy(false); }
  }

  function chooseFile(next: File | null) { setFile(next); setPreview(null); setMapping({}); setImportError(""); setImportResult(""); }
  function chooseKind(next: "clients" | "processes") { setImportKind(next); setPreview(null); setMapping({}); setImportResult(""); }

  return <section className={styles.shell}>
    {message ? <div className={styles.toast}>{message}</div> : null}
    <nav className={styles.tabs}>{tabs.map(([key, label]) => <button key={key} className={tab === key ? styles.activeTab : ""} onClick={() => setTab(key)} type="button">{label}</button>)}</nav>
    <div className={styles.content}>
      {tab === "conta" ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Conta</span><h2>Conta e acesso</h2><p>Dados do seu usuário e credenciais de entrada.</p></div>
        <div className={styles.twoColumns}>
          <form className={styles.card} onSubmit={saveAccount}><h3>Dados do usuário</h3><label>Nome<input value={account.name} onChange={(e) => setAccount({ name: e.target.value })} required /></label><label>E-mail de acesso<input value={initial.user.email} disabled /></label><button className={styles.primary} disabled={busy}>Salvar dados</button></form>
          <form className={styles.card} onSubmit={changePassword}><h3>Alterar senha</h3><label>Senha atual<input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required /></label><label>Nova senha<input type="password" minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required /></label><label>Confirme a nova senha<input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required /></label><button className={styles.primary} disabled={busy}>Alterar senha</button></form>
        </div>
      </section> : null}

      {tab === "escritorio" && isOwner ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Ficha cadastral</span><h2>Escritório</h2><p>Mantenha os dados usados nos documentos, relatórios e comunicações do escritório.</p></div>
        <form className={styles.formGrid} onSubmit={saveOffice}>
          <label className={styles.span2}>Nome do escritório<input value={office.officeName} onChange={(e) => setOffice({ ...office, officeName: e.target.value })} required /></label>
          <label>Razão social<input value={office.legalName} onChange={(e) => setOffice({ ...office, legalName: e.target.value })} /></label>
          <label>CPF/CNPJ<input value={office.taxId} onChange={(e) => setOffice({ ...office, taxId: e.target.value })} /></label>
          <label>E-mail administrativo<input type="email" value={office.adminEmail} onChange={(e) => setOffice({ ...office, adminEmail: e.target.value })} /></label>
          <label>WhatsApp do escritório<input value={office.whatsapp} onChange={(e) => setOffice({ ...office, whatsapp: e.target.value })} /></label>
          <label>CEP<input value={office.postalCode} onChange={(e) => setOffice({ ...office, postalCode: e.target.value })} onBlur={() => void lookupOfficeCep()} required />{cepMessage ? <small>{cepMessage}</small> : null}</label>
          <label className={styles.span2}>Endereço<input value={office.street} onChange={(e) => setOffice({ ...office, street: e.target.value })} required /></label>
          <label>Número<input value={office.number} onChange={(e) => setOffice({ ...office, number: e.target.value })} required /></label>
          <label>Complemento<input value={office.complement} onChange={(e) => setOffice({ ...office, complement: e.target.value })} /></label>
          <label>Bairro<input value={office.district} onChange={(e) => setOffice({ ...office, district: e.target.value })} required /></label>
          <label>Cidade<input value={office.city} onChange={(e) => setOffice({ ...office, city: e.target.value })} required /></label>
          <label>UF<select value={office.state} onChange={(e) => setOffice({ ...office, state: e.target.value })}>{UF.map((state) => <option key={state}>{state}</option>)}</select></label>
          <div className={styles.actions}><button className={styles.primary} disabled={busy}>Salvar alterações</button></div>
        </form>
      </section> : null}

      {tab === "oabs" && isOwner ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Monitoramento</span><h2>OABs do escritório</h2><p>Toda OAB ativa ocupa uma vaga do plano. OABs de auxiliares são incluídas e removidas junto com a Equipe.</p></div>
        <div className={styles.usage}><strong>{initial.oabs.length} de {oabLimit}</strong><span>OABs utilizadas no plano {planName}</span></div>
        <div className={styles.list}>{initial.oabs.map((oab) => <article key={oab.id}><div><strong>{oab.rawNumber} / {oab.state}</strong><span>{oab.userName} · {oab.isPrimary ? "Proprietário" : "Equipe"}</span></div><b>Ativa</b></article>)}</div>
        <div className={styles.schedule}><span>Consultas DJeN</span><strong>06:00 · 12:00 · 20:00</strong><small>O Jurisportal consulta automaticamente nesses horários.</small></div>
      </section> : null}

      {tab === "notificacoes" && isOwner ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Comunicação</span><h2>Notificações</h2><p>Escolha como o escritório recebe os avisos mais importantes.</p></div>
        <div className={styles.notificationList}>
          {([ ["publicationsEmail","publicationsWhatsapp","Publicações e intimações","Novidades encontradas para as OABs monitoradas."], ["deadlinesEmail","deadlinesWhatsapp","Prazos próximos","Lembretes de prazos atribuídos."], ["syncFailureEmail","syncFailureWhatsapp","Falha de sincronização","Avisos quando uma consulta automática não puder ser concluída."] ] as const).map(([emailKey, whatsKey, title, description]) => <article key={emailKey}><div><strong>{title}</strong><span>{description}</span></div><label><input type="checkbox" checked={notifications[emailKey]} onChange={(e) => setNotifications({ ...notifications, [emailKey]: e.target.checked })} /> E-mail</label><label><input type="checkbox" checked={notifications[whatsKey]} onChange={(e) => setNotifications({ ...notifications, [whatsKey]: e.target.checked })} /> WhatsApp</label></article>)}
          <article><div><strong>Relatório diário da equipe</strong><span>Enviado ao e-mail do proprietário todos os dias às 20h.</span></div><label><input type="checkbox" checked={notifications.dailyOwnerReportEmail} onChange={(e) => setNotifications({ ...notifications, dailyOwnerReportEmail: e.target.checked })} /> E-mail</label></article>
        </div>
        <button className={styles.primary} type="button" disabled={busy} onClick={saveNotifications}>Salvar preferências</button>
      </section> : null}

      {tab === "importacao" && isOwner ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Importação</span><h2>Importar clientes e processos</h2><p>Traga dados de CSV ou XLSX. Você confere o mapeamento e as inconsistências antes de qualquer registro ser criado.</p></div>
        <div className={styles.importRules}><article><strong>1. Importe os clientes</strong><span>Assim o Jurisportal consegue localizar o cliente correto ao trazer os processos.</span></article><article><strong>2. Confira a prévia</strong><span>Revise as linhas válidas, duplicadas e com erro antes de confirmar.</span></article><article><strong>3. Confirme a importação</strong><span>Somente registros válidos e dentro dos limites do plano serão criados.</span></article></div>
        <div className={styles.templateLinks}><a href="/import-templates/modelo-clientes.csv" download>Baixar modelo de clientes</a><a href="/import-templates/modelo-processos.csv" download>Baixar modelo de processos</a></div>
        <div className={styles.importBox}><div className={styles.importControls}><label>O que será importado?<select value={importKind} onChange={(e) => chooseKind(e.target.value as "clients" | "processes")}><option value="clients">Clientes</option><option value="processes">Processos</option></select></label><label>Arquivo CSV ou XLSX<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(e) => chooseFile(e.target.files?.[0] ?? null)} /></label><button className={styles.primary} type="button" disabled={!file || importBusy} onClick={() => runPreview()}>{importBusy ? "Analisando..." : "Analisar arquivo"}</button></div><small>Até 4 MB e 1.000 linhas por arquivo.</small></div>
        {importError ? <div className={styles.errorBox}>{importError}</div> : null}{importResult ? <div className={styles.successBox}>{importResult}</div> : null}
        {preview ? <><div className={styles.summary}><article><span>Linhas</span><strong>{preview.totalRows}</strong></article><article><span>Prontas</span><strong>{preview.readyRows}</strong></article><article><span>Duplicadas</span><strong>{preview.duplicateRows}</strong></article><article><span>Inválidas</span><strong>{preview.invalidRows}</strong></article><article><span>Limite do plano</span><strong>{preview.limitRows}</strong></article></div>
          <div className={styles.mapping}><div><h3>Mapeamento de colunas</h3><p>Confira qual coluna da planilha será usada em cada campo.</p></div><div className={styles.mappingGrid}>{preview.fields.map((field) => <label key={field.key}>{field.label}{field.required ? " *" : ""}<select value={mapping[field.key] ?? ""} onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}><option value="">Não importar</option>{preview.headers.map((header) => <option value={header} key={header}>{header}</option>)}</select></label>)}</div><div className={styles.actions}><button className={styles.secondary} type="button" disabled={importBusy} onClick={() => runPreview(mapping)}>Revalidar</button><button className={styles.primary} type="button" disabled={importBusy || preview.readyRows === 0} onClick={commitImport}>Importar {preview.readyRows} registro(s)</button></div></div>
          <div className={styles.tableWrap}><table><thead><tr><th>Linha</th><th>Registro</th><th>Situação</th><th>Observação</th></tr></thead><tbody>{preview.previewRows.map((row) => <tr key={row.rowNumber}><td>{row.rowNumber}</td><td><strong>{row.label}</strong><small>{importKind === "clients" ? row.values.taxId : row.values.primaryClient ? `Cliente: ${row.values.primaryClient}` : row.values.primaryClientTaxId}</small></td><td><span className={`${styles.status} ${styles[row.status]}`}>{row.status === "ready" ? "Pronta" : row.status === "duplicate" ? "Duplicada" : row.status === "limit" ? "Limite" : "Inválida"}</span></td><td>{row.errors.length ? row.errors.join(" · ") : "Pronta para importar."}</td></tr>)}</tbody></table></div>{preview.totalRows > preview.previewRows.length ? <p className={styles.note}>Mostrando as primeiras {preview.previewRows.length} linhas. O arquivo inteiro foi validado.</p> : null}</> : null}
        <div className={styles.infoBox}><strong>Seu plano</strong><p>{planName}: clientes {clientLimit === "unlimited" ? "ilimitados" : clientLimit}; processos {processLimit === "unlimited" ? "ilimitados" : processLimit}. A referência interna dos processos é criada automaticamente.</p></div>
      </section> : null}

      {tab === "seguranca" ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Acesso</span><h2>Segurança</h2><p>Controles para proteger sua conta e as sessões abertas.</p></div>
        <div className={styles.securityGrid}><article><strong>30 min</strong><span>Funcionários são desconectados após 30 minutos sem atividade.</span></article><article><strong>60 min</strong><span>O proprietário é desconectado após 1 hora sem uso.</span></article><article><strong>10 min</strong><span>Depois de 10 minutos sem interação, o funcionário deixa de contar como ativo no relatório.</span></article><article><strong>Histórico</strong><span>Ações importantes ficam registradas para consulta do escritório.</span></article></div>
        <div className={styles.sessionRow}><div><strong>Sessões ativas</strong><span>{initial.activeSessions} sessão(ões) encontradas para o seu usuário.</span></div><button className={styles.secondary} type="button" disabled={busy} onClick={revokeSessions}>Encerrar outras sessões</button></div>
      </section> : null}

      {tab === "acessibilidade" ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Acessibilidade</span><h2>Leitura e conforto visual</h2><p>Escolha o tamanho de texto que fica mais confortável neste navegador.</p></div>
        <div className={styles.fontOptions}>{[["1","Padrão","100%"],["1.1","Confortável","110%"],["1.18","Maior","118%"]].map(([value, label, percent]) => <button key={value} type="button" className={fontScale === value ? styles.selectedFont : ""} onClick={() => applyFontScale(value)}><b>Aa</b><strong>{label}</strong><span>{percent}</span></button>)}</div>
        <div className={styles.sectionHead}><h2>Cores do sistema</h2><p>Escolha a combinação que prefere. O azul e branco é o padrão. As tabelas permanecem claras para facilitar a leitura.</p></div>
        <div className={styles.themeGrid} role="group" aria-label="Cores do sistema">
          {APP_THEMES.map((option) => <button key={option.id} type="button"
            className={`${styles.themeOption} ${theme === option.id ? styles.selectedTheme : ""}`}
            aria-pressed={theme === option.id} onClick={() => applyTheme(option.id)}>
            <span className={styles.themePreview} aria-hidden="true" style={{ backgroundColor: option.surface }}>
              <i style={{ backgroundColor: option.swatch }} /><em style={{ backgroundColor: option.swatch }} />
            </span>
            <strong>{option.name}</strong><small>{theme === option.id ? "Selecionado" : "Selecionar"}</small>
          </button>)}
        </div>
        <p className={styles.appearanceNote}>A escolha é salva neste navegador para seu usuário. Não altera a aparência dos outros integrantes do escritório nem a página pública.</p>
      </section> : null}

      {tab === "suporte" ? <section className={styles.panel}>
        <div className={styles.sectionHead}><span>Atendimento</span><h2>Suporte</h2><p>Envie sua dúvida ou problema para a equipe do Jurisportal. O prazo médio de resposta é de até 48 horas.</p></div>
        <form className={styles.supportForm} onSubmit={sendSupport}>
          <label>Assunto<select value={supportTopic} onChange={(e) => setSupportTopic(e.target.value)}>{SUPPORT_TOPICS.map((topic) => <option key={topic}>{topic}</option>)}</select></label>
          {supportTopic === "Outro" ? <label>Qual é o assunto?<input value={supportOther} onChange={(e) => setSupportOther(e.target.value)} maxLength={120} required /></label> : null}
          <label>Como podemos ajudar?<textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} minLength={10} maxLength={5000} placeholder="Conte o que aconteceu ou o que você precisa..." required /></label>
          <div className={styles.supportFooter}><span>Resposta média em até 48 horas.</span><button className={styles.primary} disabled={busy}>{busy ? "Enviando..." : "Enviar solicitação"}</button></div>
        </form>
      </section> : null}
    </div>
  </section>;
}

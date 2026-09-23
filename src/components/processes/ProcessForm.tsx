"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import styles from "./Processes.module.css";

type ClientOption = {
  id: string;
  name: string;
  tradeName: string | null;
  kind: string;
  taxIdNormalized: string;
  status: string;
};

type MemberOption = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string };
};

type PartyValue = { name: string; role: string; document: string };

type ProcessFormValue = {
  id?: string;
  cnj: string;
  primaryClientId: string;
  additionalClientIds: string[];
  responsibleUserId: string;
  court: string;
  division: string;
  district: string;
  processClass: string;
  subject: string;
  caseValue: string;
  distributionDate: string;
  notes: string;
  parties: PartyValue[];
  status?: string;
};

type ApiErrorPayload = {
  error?: string;
  fields?: Record<string, string[] | undefined>;
};

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCnjInput(value: string) {
  const d = onlyDigits(value).slice(0, 20);
  let out = d.slice(0, 7);
  if (d.length > 7) out += `-${d.slice(7, 9)}`;
  if (d.length > 9) out += `.${d.slice(9, 13)}`;
  if (d.length > 13) out += `.${d.slice(13, 14)}`;
  if (d.length > 14) out += `.${d.slice(14, 16)}`;
  if (d.length > 16) out += `.${d.slice(16, 20)}`;
  return out;
}

function parseMoneyInput(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  const normalized = raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const number = Number(normalized);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function formatMoneyInput(value: string) {
  const cleaned = value.replace(/[^0-9,]/g, "");
  const [integerRaw = "", ...decimalParts] = cleaned.split(",");
  const integer = integerRaw.replace(/^0+(?=\d)/, "") || "0";
  const formattedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  if (decimalParts.length === 0) return formattedInteger;
  return `${formattedInteger},${decimalParts.join("").slice(0, 2)}`;
}

function formatDocument(value: string) {
  return value.replace(/[^0-9A-Za-z./-]/g, "").slice(0, 30);
}

function messageFromError(code?: string) {
  if (code === "PROCESS_DUPLICATE_CNJ") return "Este processo já está cadastrado neste escritório.";
  if (code === "PROCESS_LIMIT_REACHED") return "O limite de processos do seu plano foi atingido.";
  if (code === "PROCESS_CLIENT_INVALID") return "Um dos clientes selecionados não pertence a este escritório.";
  if (code === "PROCESS_RESPONSIBLE_INVALID") return "O responsável selecionado não pertence a este escritório.";
  if (code === "PROCESS_CNJ_LOCKED") return "O número CNJ já foi confirmado e não pode ser alterado pelo escritório.";
  if (code === "PROCESS_CNJ_CHANGE_REASON_REQUIRED") return "Informe o motivo da correção administrativa do número CNJ.";
  if (code === "INVALID_PROCESS") return "Revise os campos destacados antes de continuar.";
  return "Não foi possível salvar o processo. Tente novamente.";
}

function clientLabel(client: ClientOption) {
  const label = client.kind === "PJ" && client.tradeName ? `${client.tradeName} · ${client.name}` : client.name;
  return client.status === "ARCHIVED" ? `${label} · arquivado` : label;
}

export function ProcessForm({
  clients,
  members,
  currentUserId,
  initialValue,
  canEditCnj = false,
}: {
  clients: ClientOption[];
  members: MemberOption[];
  currentUserId: string;
  initialValue?: ProcessFormValue;
  canEditCnj?: boolean;
}) {
  const router = useRouter();
  const defaultResponsible = members.some((member) => member.user.id === currentUserId) ? currentUserId : "";
  const [value, setValue] = useState<ProcessFormValue>(() => initialValue ?? {
    cnj: "",
    primaryClientId: clients[0]?.id ?? "",
    additionalClientIds: [],
    responsibleUserId: defaultResponsible,
    court: "",
    division: "",
    district: "",
    processClass: "",
    subject: "",
    caseValue: "",
    distributionDate: "",
    notes: "",
    parties: [],
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [clientQuery, setClientQuery] = useState("");
  const [cnjReviewed, setCnjReviewed] = useState(Boolean(initialValue?.id));
  const [cnjCorrectionReason, setCnjCorrectionReason] = useState("");
  const cnjChanged = Boolean(initialValue?.id && onlyDigits(initialValue.cnj) !== onlyDigits(value.cnj));

  const extraClients = useMemo(() => {
    const q = clientQuery.trim().toLowerCase();
    return clients.filter((client) => client.id !== value.primaryClientId && (!q || clientLabel(client).toLowerCase().includes(q)));
  }, [clients, clientQuery, value.primaryClientId]);

  function update<K extends keyof ProcessFormValue>(field: K, next: ProcessFormValue[K]) {
    setValue((current) => ({ ...current, [field]: next }));
    setFieldErrors((current) => {
      if (!current[field as string]) return current;
      const copy = { ...current };
      delete copy[field as string];
      return copy;
    });
  }

  function toggleAdditionalClient(clientId: string) {
    setValue((current) => ({
      ...current,
      additionalClientIds: current.additionalClientIds.includes(clientId)
        ? current.additionalClientIds.filter((id) => id !== clientId)
        : [...current.additionalClientIds, clientId],
    }));
  }

  function addParty() {
    setValue((current) => ({ ...current, parties: [...current.parties, { name: "", role: "", document: "" }] }));
  }

  function updateParty(index: number, field: keyof PartyValue, next: string) {
    setValue((current) => ({
      ...current,
      parties: current.parties.map((party, partyIndex) => partyIndex === index ? { ...party, [field]: next } : party),
    }));
  }

  function removeParty(index: number) {
    setValue((current) => ({ ...current, parties: current.parties.filter((_, partyIndex) => partyIndex !== index) }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setFieldErrors({});
    if (!initialValue?.id && !cnjReviewed) {
      setFieldErrors({ cnj: "Revise o número CNJ e confirme antes de cadastrar o processo." });
      setError("O número CNJ ficará bloqueado após o cadastro. Confirme que você o revisou.");
      document.getElementById("process-cnj")?.focus();
      return;
    }
    setBusy(true);
    try {
      const response = await fetch(initialValue?.id ? `/api/processes/${initialValue.id}` : "/api/processes", {
        method: initialValue?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...value,
          caseValue: parseMoneyInput(value.caseValue),
          ...(initialValue?.id ? { cnjCorrectionReason } : { confirmCnj: cnjReviewed }),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as ApiErrorPayload;
        const errors: Record<string, string> = {};
        for (const [field, messages] of Object.entries(data.fields ?? {})) {
          if (messages?.[0]) errors[field] = messages[0];
        }
        if (data.error === "PROCESS_DUPLICATE_CNJ") errors.cnj = "Este processo já está cadastrado neste escritório.";
        setFieldErrors(errors);
        setError(messageFromError(data.error));
        const first = Object.keys(errors)[0];
        if (first) document.getElementById(`process-${first}`)?.focus();
        return;
      }
      const data = await response.json() as { process?: { id?: string } };
      const processId = data.process?.id ?? initialValue?.id;
      router.push(processId ? `/app/processos/${processId}` : "/app/processos");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const fieldClass = (name: string, extra = "") => `${styles.field} ${fieldErrors[name] ? styles.fieldError : ""} ${extra}`;
  const fieldError = (name: string) => fieldErrors[name] ? <small className={styles.fieldErrorText}>{fieldErrors[name]}</small> : null;

  if (clients.length === 0) {
    return (
      <section className={styles.emptyCard}>
        <strong>Cadastre um cliente antes do primeiro processo.</strong>
        <p>O processo manual precisa ter pelo menos um cliente representado vinculado.</p>
        <Link className={styles.primaryButton} href="/app/clientes/novo">Cadastrar cliente</Link>
      </section>
    );
  }

  return (
    <form className={`${styles.formCard} ${busy ? styles.loading : ""}`} onSubmit={submit} noValidate>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}

      <div className={styles.sectionTitle}><strong>Identificação do processo</strong><span>Comece pelo número CNJ e pelos dados que você já possui.</span></div>
      <div className={styles.grid3}>
        <div className={fieldClass("cnj", styles.span2)}>
          <label htmlFor="process-cnj">Número CNJ</label>
          <input id="process-cnj" inputMode="numeric" maxLength={25} placeholder="0000000-00.0000.0.00.0000" value={value.cnj} onChange={(e) => update("cnj", formatCnjInput(e.target.value))} aria-invalid={Boolean(fieldErrors.cnj)} readOnly={Boolean(initialValue?.id) && !canEditCnj} />
          {initialValue?.id && !canEditCnj ? <small className={styles.muted}>Número confirmado e bloqueado. Ele identifica este processo e não pode ser alterado pelo escritório.</small> : null}
          {!initialValue?.id ? <label className={styles.confirmCnj}><input type="checkbox" checked={cnjReviewed} onChange={(e) => setCnjReviewed(e.target.checked)} /><span>Revisei o número CNJ e entendo que ele ficará bloqueado após o cadastro.</span></label> : null}
          {canEditCnj && initialValue?.id ? <small className={styles.adminNotice}>Administrador mestre: uma correção de CNJ será registrada na auditoria.</small> : null}
          {fieldError("cnj")}
        </div>
        {canEditCnj && cnjChanged ? <div className={fieldClass("cnjCorrectionReason", styles.span3)}>
          <label htmlFor="process-cnjCorrectionReason">Motivo da correção do CNJ</label>
          <input id="process-cnjCorrectionReason" value={cnjCorrectionReason} onChange={(e) => setCnjCorrectionReason(e.target.value)} maxLength={500} placeholder="Explique por que o número precisa ser corrigido." />
          <small className={styles.muted}>A correção registra o número anterior, o novo número, o administrador e o motivo.</small>
        </div> : null}
        <div className={fieldClass("distributionDate")}>
          <label htmlFor="process-distributionDate">Distribuição</label>
          <input id="process-distributionDate" type="date" value={value.distributionDate} onChange={(e) => update("distributionDate", e.target.value)} />
          {fieldError("distributionDate")}
        </div>
        <div className={fieldClass("processClass")}>
          <label htmlFor="process-processClass">Classe</label>
          <input id="process-processClass" value={value.processClass} onChange={(e) => update("processClass", e.target.value)} placeholder="Ex.: Procedimento Comum Cível" />
          {fieldError("processClass")}
        </div>
        <div className={fieldClass("subject")}>
          <label htmlFor="process-subject">Assunto</label>
          <input id="process-subject" value={value.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Assunto principal do processo" />
          {fieldError("subject")}
        </div>
        <div className={fieldClass("caseValue")}>
          <label htmlFor="process-caseValue">Valor da causa</label>
          <input id="process-caseValue" inputMode="decimal" value={value.caseValue} onChange={(e) => update("caseValue", formatMoneyInput(e.target.value))} placeholder="Ex.: 25.000,00" />
          <small className={styles.muted}>Manual por enquanto. Futuras integrações poderão preencher este campo.</small>
          {fieldError("caseValue")}
        </div>
      </div>

      <div className={styles.sectionTitle}><strong>Tribunal e responsabilidade</strong><span>Esses campos poderão ser preenchidos automaticamente por integrações futuras.</span></div>
      <div className={styles.grid3}>
        <div className={fieldClass("court")}><label htmlFor="process-court">Tribunal</label><input id="process-court" value={value.court} onChange={(e) => update("court", e.target.value)} placeholder="Ex.: TJSP" />{fieldError("court")}</div>
        <div className={fieldClass("division")}><label htmlFor="process-division">Vara / unidade</label><input id="process-division" value={value.division} onChange={(e) => update("division", e.target.value)} placeholder="Ex.: 2ª Vara Cível" />{fieldError("division")}</div>
        <div className={fieldClass("district")}><label htmlFor="process-district">Comarca</label><input id="process-district" value={value.district} onChange={(e) => update("district", e.target.value)} placeholder="Ex.: Poá" />{fieldError("district")}</div>
        <div className={fieldClass("responsibleUserId", styles.span3)}>
          <label htmlFor="process-responsibleUserId">Advogado responsável</label>
          <select id="process-responsibleUserId" value={value.responsibleUserId} onChange={(e) => update("responsibleUserId", e.target.value)}>
            <option value="">Sem responsável definido</option>
            {members.map((member) => <option key={member.id} value={member.user.id}>{member.user.name} · {member.role}</option>)}
          </select>
          {fieldError("responsibleUserId")}
        </div>
      </div>

      <div className={styles.sectionTitle}><strong>Clientes representados</strong><span>Um processo pode estar ligado a vários clientes sem duplicar seus cadastros.</span></div>
      <div className={styles.grid2}>
        <div className={fieldClass("primaryClientId")}>
          <label htmlFor="process-primaryClientId">Cliente principal</label>
          <select id="process-primaryClientId" value={value.primaryClientId} onChange={(e) => {
            update("primaryClientId", e.target.value);
            setValue((current) => ({ ...current, primaryClientId: e.target.value, additionalClientIds: current.additionalClientIds.filter((id) => id !== e.target.value) }));
          }} required>
            <option value="" disabled>Selecione o cliente principal</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{clientLabel(client)}</option>)}
          </select>
          {fieldError("primaryClientId")}
        </div>
        <div className={styles.field}>
          <label htmlFor="process-client-search">Outros clientes no mesmo processo</label>
          <input id="process-client-search" value={clientQuery} onChange={(e) => setClientQuery(e.target.value)} placeholder="Filtrar clientes..." />
        </div>
      </div>
      <div className={styles.clientPicker}>
        {extraClients.length === 0 ? <span>Nenhum outro cliente encontrado.</span> : extraClients.slice(0, 30).map((client) => (
          <label key={client.id} className={styles.checkItem}>
            <input type="checkbox" checked={value.additionalClientIds.includes(client.id)} onChange={() => toggleAdditionalClient(client.id)} />
            <span><strong>{clientLabel(client)}</strong><small>{client.kind}</small></span>
          </label>
        ))}
      </div>

      <div className={styles.sectionTitle}><strong>Outras partes</strong><span>Cadastre autor, réu, reclamante, reclamado ou qualquer outro papel necessário.</span></div>
      <div className={styles.parties}>
        {value.parties.map((party, index) => (
          <div className={styles.partyRow} key={index}>
            <input value={party.name} onChange={(e) => updateParty(index, "name", e.target.value)} placeholder="Nome da parte" aria-label={`Nome da parte ${index + 1}`} />
            <input value={party.role} onChange={(e) => updateParty(index, "role", e.target.value)} placeholder="Papel: Autor, Réu..." aria-label={`Papel da parte ${index + 1}`} />
            <input value={party.document} onChange={(e) => updateParty(index, "document", formatDocument(e.target.value))} placeholder="CPF/CNPJ opcional" aria-label={`Documento da parte ${index + 1}`} />
            <button type="button" className={styles.iconDanger} onClick={() => removeParty(index)} aria-label={`Remover parte ${index + 1}`}>×</button>
          </div>
        ))}
        <button type="button" className={styles.secondaryButton} onClick={addParty}>+ Adicionar parte</button>
        {fieldError("parties")}
      </div>

      <div className={styles.sectionTitle}><strong>Observações internas</strong><span>Informações do escritório, sem envio automático ao cliente.</span></div>
      <div className={fieldClass("notes")}>
        <textarea id="process-notes" value={value.notes} onChange={(e) => update("notes", e.target.value)} maxLength={4000} />
        {fieldError("notes")}
      </div>

      <div className={styles.formActions}>
        <Link className={styles.secondaryButton} href={initialValue?.id ? `/app/processos/${initialValue.id}` : "/app/processos"}>Cancelar</Link>
        <button className={styles.primaryButton} type="submit" disabled={busy}>{busy ? "Salvando..." : initialValue?.id ? "Salvar alterações" : "Cadastrar processo"}</button>
      </div>
    </form>
  );
}

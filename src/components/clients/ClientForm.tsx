"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { formatCepInput, formatPhoneInput, formatTaxIdInput } from "@/shared/formatters/br-input";
import styles from "./Clients.module.css";

type ClientFormValue = {
  id?: string;
  kind: "PF" | "PJ";
  name: string;
  tradeName: string;
  taxId: string;
  birthDate: string;
  primaryContactName: string;
  email: string;
  whatsapp: string;
  phone: string;
  postalCode: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  notes: string;
  status?: string;
};

type FieldName = Exclude<keyof ClientFormValue, "id" | "status">;
type FieldErrors = Partial<Record<FieldName, string>>;

type ApiErrorPayload = {
  error?: string;
  fields?: Record<string, string[] | undefined>;
};

const emptyValue: ClientFormValue = {
  kind: "PF", name: "", tradeName: "", taxId: "", birthDate: "", primaryContactName: "",
  email: "", whatsapp: "", phone: "", postalCode: "", street: "", number: "", complement: "",
  district: "", city: "", state: "SP", notes: "",
};

function prepareInitialValue(initialValue?: ClientFormValue): ClientFormValue {
  const source = initialValue ?? emptyValue;
  return {
    ...source,
    taxId: formatTaxIdInput(source.taxId, source.kind),
    whatsapp: formatPhoneInput(source.whatsapp),
    phone: formatPhoneInput(source.phone),
    postalCode: formatCepInput(source.postalCode),
  };
}

function messageFromError(code?: string) {
  if (code === "CLIENT_DUPLICATE_TAX_ID") return "Já existe um cliente com este CPF/CNPJ neste escritório.";
  if (code === "CLIENT_LIMIT_REACHED") return "O limite de clientes do seu plano foi atingido.";
  if (code === "INVALID_CLIENT") return "Revise os campos destacados abaixo.";
  if (code === "CLIENT_DELETE_FORBIDDEN") return "Somente o proprietário do escritório pode excluir um cliente permanentemente.";
  if (code === "CLIENT_HAS_PROCESS_LINKS") return "Este cliente possui processo(s) vinculado(s). Arquive o cadastro em vez de excluí-lo permanentemente.";
  if (code === "CLIENT_DELETE_FAILED") return "Não foi possível excluir o cliente. Tente novamente.";
  return "Não foi possível salvar o cliente. Tente novamente.";
}

function extractFieldErrors(fields?: Record<string, string[] | undefined>): FieldErrors {
  if (!fields) return {};
  const result: FieldErrors = {};
  for (const [field, messages] of Object.entries(fields)) {
    if (!messages?.[0]) continue;
    result[field as FieldName] = messages[0];
  }
  return result;
}

function fieldId(field: FieldName): string {
  return `client-${field}`;
}

export function ClientForm({ initialValue }: { initialValue?: ClientFormValue }) {
  const router = useRouter();
  const [value, setValue] = useState<ClientFormValue>(() => prepareInitialValue(initialValue));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [cepMessage, setCepMessage] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const update = (field: FieldName, nextValue: string) => {
    setValue((current) => ({ ...current, [field]: nextValue }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  function switchKind(kind: "PF" | "PJ") {
    if (kind === value.kind) return;
    setValue((current) => ({
      ...current,
      kind,
      taxId: "",
      birthDate: kind === "PF" ? current.birthDate : "",
      tradeName: kind === "PJ" ? current.tradeName : "",
      primaryContactName: kind === "PJ" ? current.primaryContactName : "",
    }));
    setFieldErrors({});
    setError("");
  }

  function classFor(field: FieldName, extra = "") {
    return `${styles.field} ${fieldErrors[field] ? styles.fieldInvalid : ""} ${extra}`.trim();
  }

  function errorFor(field: FieldName) {
    const message = fieldErrors[field];
    if (!message) return null;
    return <small className={styles.fieldError} role="alert">{message}</small>;
  }

  function focusFirstInvalid(fields: FieldErrors) {
    const first = Object.keys(fields)[0] as FieldName | undefined;
    if (!first) return;
    window.requestAnimationFrame(() => {
      document.getElementById(fieldId(first))?.focus();
    });
  }

  async function lookupCep() {
    const cep = value.postalCode.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setCepMessage("Consultando CEP...");
    try {
      const response = await fetch(`/api/cep/${cep}`);
      if (!response.ok) {
        setCepMessage("CEP não encontrado. Preencha o endereço manualmente.");
        return;
      }
      const data = await response.json() as { street?: string; district?: string; city?: string; state?: string };
      setValue((current) => ({
        ...current,
        street: data.street || current.street,
        district: data.district || current.district,
        city: data.city || current.city,
        state: data.state || current.state,
      }));
      setCepMessage("Endereço encontrado. Confira antes de salvar.");
    } catch {
      setCepMessage("Não foi possível consultar o CEP. Preencha manualmente.");
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const response = await fetch(initialValue?.id ? `/api/clients/${initialValue.id}` : "/api/clients", {
        method: initialValue?.id ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(value),
      });
      const data = await response.json().catch(() => ({})) as ApiErrorPayload;
      if (!response.ok) {
        const nextFieldErrors = extractFieldErrors(data.fields);
        if (data.error === "CLIENT_DUPLICATE_TAX_ID") {
          nextFieldErrors.taxId = "Este CPF/CNPJ já está cadastrado neste escritório.";
        }
        setFieldErrors(nextFieldErrors);
        setError(messageFromError(data.error));
        focusFirstInvalid(nextFieldErrors);
        return;
      }
      router.push("/app/clientes");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function changeArchived(archived: boolean) {
    if (!initialValue?.id) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/clients/${initialValue.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ archived }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as ApiErrorPayload;
        setError(messageFromError(data.error));
        return;
      }
      router.push("/app/clientes");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function deletePermanently() {
    if (!initialValue?.id) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/clients/${initialValue.id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json().catch(() => ({})) as ApiErrorPayload;
        setError(messageFromError(data.error));
        return;
      }
      router.push("/app/clientes");
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${styles.formCard} ${busy ? styles.loading : ""}`} noValidate>
      {error ? <div className={styles.error} role="alert">{error}</div> : null}
      <div className={styles.kindSwitch}>
        <button type="button" className={value.kind === "PF" ? styles.active : ""} onClick={() => switchKind("PF")}>Pessoa física</button>
        <button type="button" className={value.kind === "PJ" ? styles.active : ""} onClick={() => switchKind("PJ")}>Pessoa jurídica</button>
      </div>

      <div className={styles.sectionTitle}><strong>Identificação</strong><span>Dados principais do cliente.</span></div>
      <div className={styles.grid}>
        <div className={classFor("name")}><label htmlFor={fieldId("name")}>{value.kind === "PF" ? "Nome completo" : "Razão social"}</label><input id={fieldId("name")} value={value.name} onChange={(e) => update("name", e.target.value)} aria-invalid={Boolean(fieldErrors.name)} />{errorFor("name")}</div>
        {value.kind === "PJ"
          ? <div className={classFor("tradeName")}><label htmlFor={fieldId("tradeName")}>Nome fantasia</label><input id={fieldId("tradeName")} value={value.tradeName} onChange={(e) => update("tradeName", e.target.value)} aria-invalid={Boolean(fieldErrors.tradeName)} />{errorFor("tradeName")}</div>
          : <div className={classFor("birthDate")}><label htmlFor={fieldId("birthDate")}>Data de nascimento</label><input id={fieldId("birthDate")} type="date" value={value.birthDate} onChange={(e) => update("birthDate", e.target.value)} aria-invalid={Boolean(fieldErrors.birthDate)} />{errorFor("birthDate")}</div>}
        <div className={classFor("taxId")}><label htmlFor={fieldId("taxId")}>{value.kind === "PF" ? "CPF" : "CNPJ"}</label><input id={fieldId("taxId")} inputMode="numeric" autoComplete="off" maxLength={value.kind === "PF" ? 14 : 18} placeholder={value.kind === "PF" ? "000.000.000-00" : "00.000.000/0000-00"} value={value.taxId} onChange={(e) => update("taxId", formatTaxIdInput(e.target.value, value.kind))} aria-invalid={Boolean(fieldErrors.taxId)} />{errorFor("taxId")}</div>
        {value.kind === "PJ" ? <div className={classFor("primaryContactName")}><label htmlFor={fieldId("primaryContactName")}>Contato principal</label><input id={fieldId("primaryContactName")} value={value.primaryContactName} onChange={(e) => update("primaryContactName", e.target.value)} aria-invalid={Boolean(fieldErrors.primaryContactName)} />{errorFor("primaryContactName")}</div> : null}
      </div>

      <div className={styles.sectionTitle}><strong>Contato</strong><span>Informações usadas pelo escritório para comunicação.</span></div>
      <div className={styles.grid3}>
        <div className={classFor("email")}><label htmlFor={fieldId("email")}>E-mail</label><input id={fieldId("email")} type="email" value={value.email} onChange={(e) => update("email", e.target.value)} aria-invalid={Boolean(fieldErrors.email)} />{errorFor("email")}</div>
        <div className={classFor("whatsapp")}><label htmlFor={fieldId("whatsapp")}>WhatsApp</label><input id={fieldId("whatsapp")} inputMode="tel" autoComplete="tel" maxLength={15} value={value.whatsapp} onChange={(e) => update("whatsapp", formatPhoneInput(e.target.value))} placeholder="(11) 99999-9999" aria-invalid={Boolean(fieldErrors.whatsapp)} />{errorFor("whatsapp")}</div>
        <div className={classFor("phone")}><label htmlFor={fieldId("phone")}>Telefone opcional</label><input id={fieldId("phone")} inputMode="tel" autoComplete="tel" maxLength={15} value={value.phone} onChange={(e) => update("phone", formatPhoneInput(e.target.value))} placeholder="(11) 3333-4444" aria-invalid={Boolean(fieldErrors.phone)} />{errorFor("phone")}</div>
      </div>

      <div className={styles.sectionTitle}><strong>Endereço</strong><span>O CEP tenta preencher os campos automaticamente, mas todos continuam editáveis.</span></div>
      <div className={styles.grid3}>
        <div className={classFor("postalCode")}><label htmlFor={fieldId("postalCode")}>CEP</label><input id={fieldId("postalCode")} inputMode="numeric" autoComplete="postal-code" maxLength={9} placeholder="00000-000" value={value.postalCode} onChange={(e) => update("postalCode", formatCepInput(e.target.value))} onBlur={lookupCep} aria-invalid={Boolean(fieldErrors.postalCode)} />{errorFor("postalCode")}<small>{cepMessage}</small></div>
        <div className={classFor("street", styles.fieldFull)}><label htmlFor={fieldId("street")}>Logradouro</label><input id={fieldId("street")} value={value.street} onChange={(e) => update("street", e.target.value)} aria-invalid={Boolean(fieldErrors.street)} />{errorFor("street")}</div>
        <div className={classFor("number")}><label htmlFor={fieldId("number")}>Número</label><input id={fieldId("number")} value={value.number} onChange={(e) => update("number", e.target.value)} placeholder="123 ou S/N" aria-invalid={Boolean(fieldErrors.number)} />{errorFor("number")}</div>
        <div className={classFor("complement")}><label htmlFor={fieldId("complement")}>Complemento</label><input id={fieldId("complement")} value={value.complement} onChange={(e) => update("complement", e.target.value)} aria-invalid={Boolean(fieldErrors.complement)} />{errorFor("complement")}</div>
        <div className={classFor("district")}><label htmlFor={fieldId("district")}>Bairro</label><input id={fieldId("district")} value={value.district} onChange={(e) => update("district", e.target.value)} aria-invalid={Boolean(fieldErrors.district)} />{errorFor("district")}</div>
        <div className={classFor("city")}><label htmlFor={fieldId("city")}>Cidade</label><input id={fieldId("city")} value={value.city} onChange={(e) => update("city", e.target.value)} aria-invalid={Boolean(fieldErrors.city)} />{errorFor("city")}</div>
        <div className={classFor("state")}><label htmlFor={fieldId("state")}>UF</label><input id={fieldId("state")} maxLength={2} value={value.state} onChange={(e) => update("state", e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))} aria-invalid={Boolean(fieldErrors.state)} />{errorFor("state")}</div>
      </div>

      <div className={styles.sectionTitle}><strong>Observações</strong><span>Informação interna do escritório. Não será enviada automaticamente ao cliente.</span></div>
      <div className={classFor("notes")}><textarea id={fieldId("notes")} value={value.notes} onChange={(e) => update("notes", e.target.value)} maxLength={4000} aria-invalid={Boolean(fieldErrors.notes)} />{errorFor("notes")}</div>

      {initialValue?.id ? (
        <>
          <div className={styles.archiveBox}>
            <div><strong>{initialValue.status === "ARCHIVED" ? "Cliente arquivado" : "Arquivar cliente"}</strong><span>Arquivar preserva o cadastro e permite restaurá-lo depois.</span></div>
            <button type="button" className={initialValue.status === "ARCHIVED" ? styles.secondaryButton : styles.dangerButton} onClick={() => changeArchived(initialValue.status !== "ARCHIVED")}>{initialValue.status === "ARCHIVED" ? "Restaurar cliente" : "Arquivar"}</button>
          </div>

          <div className={styles.deleteBox}>
            <div>
              <strong>Excluir permanentemente</strong>
              <span>Use somente quando o cadastro realmente precisar ser removido. A exclusão não poderá ser desfeita.</span>
            </div>
            {!confirmingDelete ? (
              <button type="button" className={styles.dangerButton} onClick={() => setConfirmingDelete(true)}>Excluir cliente</button>
            ) : (
              <div className={styles.deleteConfirm}>
                <span>Tem certeza? O cadastro será apagado.</span>
                <div>
                  <button type="button" className={styles.secondaryButton} onClick={() => setConfirmingDelete(false)}>Cancelar</button>
                  <button type="button" className={styles.dangerSolidButton} onClick={deletePermanently}>Sim, excluir permanentemente</button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      <div className={styles.formActions}>
        <Link className={styles.secondaryButton} href="/app/clientes">Cancelar</Link>
        <button className={styles.primaryButton} type="submit">{initialValue?.id ? "Salvar alterações" : "Cadastrar cliente"}</button>
      </div>
    </form>
  );
}

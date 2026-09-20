"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Processes.module.css";

function parseMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

export function ProcessFeeAgreementForm({
  processId,
  caseValue,
  initial,
}: {
  processId: string;
  caseValue: number | null;
  initial: {
    model: string;
    fixedAmount: number | null;
    contractedAmount: number | null;
    successPercentage: number | null;
    successBase: string;
    notes: string;
  };
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [model, setModel] = useState(initial.model);
  const [fixedAmount, setFixedAmount] = useState(initial.fixedAmount?.toString().replace(".", ",") ?? "");
  const [percentage, setPercentage] = useState(initial.successPercentage?.toString().replace(".", ",") ?? "");
  const [manualAmount, setManualAmount] = useState(initial.model === "MANUAL" ? initial.contractedAmount?.toString().replace(".", ",") ?? "" : "");

  const fixed = parseMoney(fixedAmount) ?? 0;
  const pct = parseMoney(percentage) ?? 0;
  const preview = model === "FIXED"
    ? fixed
    : model === "PERCENTAGE"
      ? (caseValue ?? 0) * pct / 100
      : model === "FIXED_PLUS_PERCENTAGE"
        ? fixed + (caseValue ?? 0) * pct / 100
        : parseMoney(manualAmount) ?? 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch(`/api/processes/${processId}/finance/agreement`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        fixedAmount: parseMoney(fixedAmount),
        contractedAmount: parseMoney(manualAmount),
        successPercentage: parseMoney(percentage),
        percentageBase: "CASE_VALUE",
        successBase: form.get("successBase"),
        notes: form.get("notes"),
      }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setLoading(false);
    if (!response.ok) {
      if (payload.error === "CASE_VALUE_REQUIRED") setMessage("Informe primeiro o valor da causa para calcular os honorários percentuais.");
      else setMessage("Confira os valores do contrato de honorários.");
      return;
    }
    setMessage("Contrato atualizado.");
    router.refresh();
  }

  return <form className={styles.financeForm} onSubmit={submit}>
    <h3>Contrato de honorários</h3>
    <div className={styles.financeCalculationNote}>
      <span>Valor da causa</span>
      <strong>{caseValue !== null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(caseValue) : "Não informado"}</strong>
      <small>O cálculo percentual usa o valor da causa atual e salva o valor contratado como histórico. Alterar o valor da causa depois não recalcula silenciosamente o contrato.</small>
    </div>
    <div className={styles.grid2}>
      <div className={styles.field}><label>Modelo</label><select name="model" value={model} onChange={(e) => setModel(e.target.value)}><option value="FIXED">Fixo</option><option value="PERCENTAGE">Percentual do valor da causa</option><option value="FIXED_PLUS_PERCENTAGE">Fixo + percentual do valor da causa</option><option value="MANUAL">Outro/manual</option></select></div>
      {(model === "FIXED" || model === "FIXED_PLUS_PERCENTAGE") ? <div className={styles.field}><label>Parcela fixa</label><input name="fixedAmount" inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} placeholder="8000,00" /></div> : null}
      {(model === "PERCENTAGE" || model === "FIXED_PLUS_PERCENTAGE") ? <div className={styles.field}><label>Percentual (%)</label><input name="successPercentage" inputMode="decimal" value={percentage} onChange={(e) => setPercentage(e.target.value)} placeholder="20" /></div> : null}
      {model === "MANUAL" ? <div className={styles.field}><label>Valor contratado</label><input name="contractedAmount" inputMode="decimal" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="8000,00" /></div> : null}
      {(model === "PERCENTAGE" || model === "FIXED_PLUS_PERCENTAGE") ? <div className={styles.field}><label>Base do percentual</label><input name="successBase" value="Valor da causa" readOnly /></div> : <div className={styles.field}><label>Base / referência opcional</label><input name="successBase" defaultValue={initial.successBase} placeholder="Ex.: contrato particular" /></div>}
      <div className={styles.field}><label>Valor contratado atual</label><strong className={styles.calculatedMoney}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(initial.contractedAmount ?? 0)}</strong></div>
      <div className={styles.field}><label>Valor se salvar agora</label><strong className={styles.calculatedMoney}>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(preview)}</strong></div>
      <div className={`${styles.field} ${styles.span2}`}><label>Observações</label><textarea name="notes" defaultValue={initial.notes} /></div>
    </div>
    {message ? <span className={styles.formMessage}>{message}</span> : null}
    <div className={styles.inlineFormActions}><button className={styles.primaryButton} disabled={loading}>{loading ? "Salvando..." : "Salvar contrato"}</button></div>
  </form>;
}

export function ProcessFinanceEntryForm({ processId }: { processId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  if (!open) return <button className={styles.primaryButton} onClick={() => setOpen(true)}>+ Lançamento</button>;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); const form = new FormData(event.currentTarget); const amount = parseMoney(form.get("amount"));
    const response = await fetch(`/api/processes/${processId}/finance/entries`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: form.get("kind"), description: form.get("description"), amount, entryDate: form.get("entryDate"), status: form.get("status"), paidBy: form.get("paidBy"), reimbursable: form.get("reimbursable") === "on", notes: form.get("notes") }) });
    setLoading(false); if (!response.ok) { setError("Confira os campos do lançamento."); return; } setOpen(false); router.refresh();
  }
  return <form className={styles.inlineFormWide} onSubmit={submit}><div className={styles.inlineFormTitle}><strong>Novo lançamento</strong><button type="button" onClick={() => setOpen(false)}>×</button></div><div className={styles.grid2}>
    <div className={styles.field}><label>Tipo</label><select name="kind"><option value="FEE_RECEIPT">Honorário / recebimento</option><option value="COST">Custa / despesa</option><option value="REIMBURSEMENT">Reembolso</option></select></div>
    <div className={styles.field}><label>Status</label><select name="status"><option value="PENDING">Pendente</option><option value="PAID">Pago/recebido</option></select></div>
    <div className={`${styles.field} ${styles.span2}`}><label>Descrição</label><input name="description" required /></div>
    <div className={styles.field}><label>Valor</label><input name="amount" required inputMode="decimal" placeholder="480,00" /></div>
    <div className={styles.field}><label>Data</label><input name="entryDate" type="date" required /></div>
    <div className={styles.field}><label>Pago por</label><input name="paidBy" placeholder="Escritório, cliente..." /></div>
    <label className={styles.checkboxLine}><input name="reimbursable" type="checkbox" /> Reembolsável</label>
    <div className={`${styles.field} ${styles.span2}`}><label>Observações</label><textarea name="notes" /></div>
  </div>{error ? <div className={styles.error}>{error}</div> : null}<div className={styles.inlineFormActions}><button type="button" className={styles.secondaryButton} onClick={() => setOpen(false)}>Cancelar</button><button className={styles.primaryButton} disabled={loading}>{loading ? "Salvando..." : "Adicionar"}</button></div></form>;
}

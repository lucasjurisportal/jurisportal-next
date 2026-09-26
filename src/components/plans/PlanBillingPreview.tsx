"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currency, getAnnualPrice, getMonthlyPrice } from "@/modules/plans/application/plan-pricing";
import { planChangePreview, PLANNED_AI_MONTHLY_CREDITS } from "@/modules/plans/domain/plan-change-preview";
import type { BillingCycle, PlanDefinition, PlanSlug } from "@/modules/plans/domain/plan.types";
import styles from "./PlanBilling.module.css";

type Props = {
  organizationName: string;
  ownerName: string;
  ownerEmail: string;
  plans: PlanDefinition[];
  currentPlanSlug: string;
  currentCycle: BillingCycle;
  subscriptionStatus: string | null;
  periodEnd: string | null;
  processCount: number;
  pilotEndsAt: string | null;
};
const statusLabels: Record<string, string> = {
  active: "Ativo", trialing: "Período gratuito", pending_payment: "Pagamento pendente",
  pending_verification: "Cadastro pendente", internal: "Ambiente de desenvolvimento",
  canceled: "Cancelado", expired: "Expirado", pilot: "Acesso de teste gratuito",
};
const dateBR = (iso: string | null): string | null => iso && !Number.isNaN(new Date(iso).getTime())
  ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null;
const credits = (value: number) => new Intl.NumberFormat("pt-BR").format(value);

export function PlanBillingPreview({ organizationName, ownerName, ownerEmail, plans, currentPlanSlug,
  currentCycle, subscriptionStatus, periodEnd, processCount, pilotEndsAt }: Props) {
  const [cycle, setCycle] = useState<BillingCycle>(currentCycle);
  const [selectedSlug, setSelectedSlug] = useState(currentPlanSlug);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState<"choose" | "confirm" | "double-check" | "payment">("choose");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "boleto" | "card">("pix");
  const [couponInput, setCouponInput] = useState("");
  const [couponStatus, setCouponStatus] = useState<"idle" | "loading" | "valid" | "invalid">("idle");
  const [couponQuote, setCouponQuote] = useState<{ discountCents:number;firstPaymentCents:number;nextPaymentCents:number;percent:number;kind?: "referral" | "migration" } | null>(null);
  const [referralRegistered, setReferralRegistered] = useState(false);
  const [couponError, setCouponError] = useState("");
  const current = plans.find((item) => item.slug === currentPlanSlug) ?? plans[0];
  const selected = plans.find((item) => item.slug === selectedSlug) ?? current;
  const currentIndex = plans.findIndex((item) => item.slug === current.slug);
  const next = plans[currentIndex + 1] ?? null;
  const comparison = planChangePreview(plans, current.slug, selected.slug, processCount);
  const period = dateBR(periodEnd);
  const renewalDate = subscriptionStatus === "active" ? period : null;
  const pilotUntil = dateBR(pilotEndsAt);
  const clearCoupon = () => { setCouponQuote(null); setCouponStatus("idle"); setCouponError(""); setReferralRegistered(false); };
  const previewCoupon = async () => {
    setCouponStatus("loading"); setCouponQuote(null); setCouponError("");
    try {
      const response = await fetch("/api/plans/promotion/preview", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, cycle, planSlug: selected.slug }),
      });
      if (!response.ok) throw new Error("Este cupom não está disponível para este escritório e plano.");
      const quote = await response.json() as { discountCents:number;firstPaymentCents:number;nextPaymentCents:number;percent:number;kind?: "referral" | "migration" };
      setCouponQuote(quote); setCouponStatus("valid");
    } catch {
      setCouponStatus("invalid"); setCouponError("Não foi possível aplicar o cupom. Confira o código e as condições.");
    }
  };
  async function registerReferral() {
    setCouponError("");
    try {
      const response = await fetch("/api/referrals/claim", { method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput, cycle }),
      });
      if (!response.ok) throw new Error("REFERRAL_FAILED");
      setReferralRegistered(true);
    } catch { setCouponError("Não foi possível registrar o convite para este escritório."); }
  }
  const isFree = current.slug === "free";
  const fee = isFree ? 0 : currentCycle === "annual" ? getAnnualPrice(current) : getMonthlyPrice(current);
  useEffect(() => {
    if (!modalOpen) return;
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setModalOpen(false); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [modalOpen]);
  const openModal = () => { setSelectedSlug(next?.slug ?? current.slug); setCycle(currentCycle); clearCoupon(); setStep("choose"); setModalOpen(true); };

  return <div className={styles.page}>
    <section className={styles.heading}>
      <span className={styles.eyebrow}>Administração</span>
      <h1>Plano e cobrança</h1>
      <p>Confira sua assinatura, seus limites e as opções de pagamento.</p>
    </section>
    {subscriptionStatus === "pilot" && <div className={styles.banner} role="status"><strong>Teste gratuito autorizado</strong><span>Acesso temporário até {pilotUntil ?? "data não informada"}. Nenhuma cobrança é criada; dados do escritório permanecem separados dos demais.</span></div>}
    <div className={styles.banner} role="status"><strong>Prévia, sem cobranças</strong>
      <span>A alteração do plano, os créditos adicionais e o pagamento serão ativados após a integração financeira. Nenhuma escolha nesta tela exclui processos ou gera cobrança.</span>
    </div>

    <section className={styles.summary} aria-label="Assinatura atual">
      <article><span>Seu plano</span><strong>{current.name}</strong><small>{organizationName}</small></article>
      <article><span>Situação</span><strong>{subscriptionStatus ? statusLabels[subscriptionStatus] ?? "Em configuração" : "Em configuração"}</strong>
        <small>{processCount} processo(s) cadastrado(s)</small></article>
      <article><span>{isFree ? "Plano gratuito" : currentCycle === "annual" ? "Anualidade" : "Mensalidade"}</span>
        <strong>{isFree ? "Grátis" : currency(fee)}</strong><small>Valor de referência do catálogo. Pagamento não confirmado.</small></article>
      <article><span>Próxima renovação</span><strong>{renewalDate ?? "Não registrada"}</strong><small>{currentCycle === "annual" ? "Modalidade anual" : isFree ? "Período gratuito" : "Modalidade mensal"}</small></article>
    </section>

    <section className={styles.columns}>
      <article className={styles.panel}>
        <div className={styles.panelHead}><div><h2>Seu plano</h2><p>Utilização e capacidade atual do escritório.</p></div>
          <button className={styles.primary} type="button" onClick={openModal}>Alterar plano</button></div>
        <div className={styles.field}><span>Processos</span><strong>{processCount} de {current.registeredProcessLimit === "unlimited" ? "ilimitados" : current.registeredProcessLimit}</strong></div>
        <div className={styles.field}><span>Usuários e OABs</span><strong>{current.users} usuário(s) · {current.oabs} OAB(s)</strong></div>
        <div className={styles.field}><span>Armazenamento contratado</span><strong>{current.storageLimitGb} GB</strong></div>
        {next ? <p className={styles.note}>Próximo plano: <strong>{next.name}</strong>, com até {next.registeredProcessLimit} processos e {next.storageLimitGb} GB.</p>
          : <p className={styles.note}>Você está na categoria Alta Corte.</p>}
      </article>
      <article className={styles.panel}>
        <h2>Pagamento</h2><p>Informações cadastradas da assinatura.</p>
        <div className={styles.field}><span>Método de pagamento</span><strong>Não registrado no Jurisportal</strong></div>
        <div className={styles.field}><span>{currentCycle === "annual" ? "Anualidade" : "Mensalidade"}</span>
          <strong>{isFree ? "Grátis" : currency(fee)}</strong></div>
        <div className={styles.field}><span>Data de renovação</span><strong>{renewalDate ?? "Não registrada"}</strong></div>
        <p className={styles.help}>Pix: confirmação geralmente rápida; reserve até 2h para atualização do status no sistema. Boleto: compensação pode levar até 48h ou mais, conforme banco e provedor. Prefira Pix quando precisar de confirmação mais rápida.</p>
      </article>
    </section>

    <section className={styles.columns}>
      <article className={styles.panel}>
        <h2>Créditos de IA</h2>
        <div className={styles.field}><span>Previsão mensal no seu plano</span>
          <strong>{credits(PLANNED_AI_MONTHLY_CREDITS[current.slug])} créditos</strong></div>
        <div className={styles.field}><span>Saldo disponível</span><strong>Aguardando implantação</strong></div>
        <p className={styles.help}>A distribuição prevista de créditos ainda não está ativada no código de IA. O saldo, o consumo e os pacotes extras serão exibidos após a implantação do controle de créditos.</p>
        <button type="button" className={styles.disabledButton} disabled>Comprar créditos (em breve)</button>
      </article>
      <article className={styles.panel}>
        <h2>Dados de cobrança</h2>
        <div className={styles.field}><span>Escritório</span><strong>{organizationName}</strong></div>
        <div className={styles.field}><span>Responsável</span><strong>{ownerName}</strong></div>
        <div className={styles.field}><span>E-mail</span><strong className={styles.break}>{ownerEmail}</strong></div>
        <Link className={styles.link} href="/app/configuracoes?tab=escritorio">Conferir ficha cadastral</Link>
      </article>
    </section>
    <section className={styles.panel}><h2>Faturas e histórico</h2><p>Não há faturas registradas pelo provedor de pagamentos nesta fase.</p></section>

    {modalOpen && <div className={styles.overlay}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="plan-dialog-title">
        <div className={styles.panelHead}>
          <div><span className={styles.eyebrow}>Plano e cobrança</span>
            <h2 id="plan-dialog-title">{step === "choose" ? "Alterar plano" : step === "payment" ? "Pagamento" : "Confirmar mudança de plano"}</h2></div>
          <button type="button" aria-label="Fechar" className={styles.close} onClick={() => setModalOpen(false)}>✕</button>
        </div>
        {step === "choose" ? <>
          <div className={styles.switch} role="group" aria-label="Modalidade">
            <button type="button" aria-pressed={cycle === "annual"} className={cycle === "annual" ? styles.pressed : ""} onClick={() => { setCycle("annual"); clearCoupon(); }}>Anual</button>
            <button type="button" aria-pressed={cycle === "monthly"} className={cycle === "monthly" ? styles.pressed : ""} onClick={() => { setCycle("monthly"); clearCoupon(); }}>Mensal</button>
          </div>
          <div className={styles.grid}>
            {plans.map((plan) => <button key={plan.slug} type="button" className={`${styles.plan} ${selectedSlug === plan.slug ? styles.selected : ""}`}
              aria-pressed={selectedSlug === plan.slug} onClick={() => { setSelectedSlug(plan.slug); clearCoupon(); }}>
              <span className={styles.planName}>{plan.name} {plan.slug === current.slug ? <em>Atual</em> : null}</span>
              <strong>{plan.slug === "free" ? "Grátis" : currency(cycle === "annual" ? getAnnualPrice(plan) : getMonthlyPrice(plan))}</strong>
              <small>{plan.slug === "free" ? "3 meses" : cycle === "annual" ? "Anualidade" : "Mensalidade"}</small>
              <span>{plan.users} usuário(s) · {plan.oabs} OAB(s)</span>
              <span>{plan.registeredProcessLimit} processos · {plan.storageLimitGb} GB</span>
            </button>)}
          </div>
          {comparison.direction === "downgrade" && <p className={styles.warning} role="alert">
            Antes de reduzir o plano, exporte os processos que não caberão no novo limite. {comparison.excessProcesses > 0
              ? `Sua carteira tem ${comparison.excessProcesses} processo(s) acima do limite selecionado. ` : ""}
            A alteração real exigirá escolher quais processos manter e confirmar novamente. Nesta prévia nada será removido.</p>}
          <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setModalOpen(false)}>Cancelar</button>
            <button type="button" className={styles.primary} disabled={comparison.direction === "same" && cycle === currentCycle}
              onClick={() => setStep(comparison.direction === "downgrade" ? "confirm" : "payment")}>
              {comparison.direction === "downgrade" ? "Continuar" : "Ir para pagamento"}</button></div>
        </> : step === "confirm" || step === "double-check" ? <>
          <p>Você tem certeza de que quer mudar para {selected.name}?</p>
          <p className={styles.warning} role="alert">Planos menores têm limites reduzidos. Faça o download dos processos excedentes antes de contratar. Não há exclusão automática nesta prévia.</p>
          {comparison.requiresReview && <p className={styles.warning}>Existem {comparison.excessProcesses} processo(s) acima do limite. Na versão de pagamento, a redução será bloqueada até regularizar a carteira com confirmação explícita.</p>}
          <div className={styles.actions}><button className={styles.secondary} type="button" onClick={() => setStep("choose")}>Voltar</button>
            <button className={styles.primary} type="button" onClick={() => setStep(step === "confirm" ? "double-check" : "payment")}>
              {step === "confirm" ? "Sim, continuar" : "Confirmar escolha"}</button></div>
        </> : <>
          <div className={styles.field}><span>Plano selecionado</span><strong>{selected.name}</strong></div>
          <div className={styles.field}><span>{cycle === "annual" ? "Anualidade" : "Mensalidade"}</span><strong>{currency(cycle === "annual" ? getAnnualPrice(selected) : getMonthlyPrice(selected))}</strong></div>
          {selected.slug !== "free" && <div className={styles.couponBox}>
            <label htmlFor="jurisportal-coupon">Cupom de desconto ou código de indicação</label>
            <div className={styles.couponRow}>
              <input id="jurisportal-coupon" type="text" value={couponInput} autoComplete="off"
                placeholder="Digite seu cupom" maxLength={100} onChange={(event) => { setCouponInput(event.target.value); clearCoupon(); }} />
              <button className={styles.secondary} type="button" disabled={!couponInput.trim() || couponStatus === "loading"} onClick={previewCoupon}>
                {couponStatus === "loading" ? "Verificando..." : "Aplicar"}
              </button>
            </div>
            {couponStatus === "valid" && couponQuote && <p className={styles.couponSuccess} role="status">
              {couponQuote.kind === "referral" ? "Indicação" : "Cupom"} válido: {couponQuote.percent}% na primeira {cycle === "annual" ? "anualidade" : "mensalidade"}.
              <br />Primeira cobrança: <strong>{currency(couponQuote.firstPaymentCents / 100)}</strong> (economia de {currency(couponQuote.discountCents / 100)}).
              <br />Próximas cobranças: {currency(couponQuote.nextPaymentCents / 100)}.
              <br />O desconto será consumido apenas após a confirmação do pagamento, quando a integração financeira estiver habilitada.
              {couponQuote.kind === "referral" ? <><br />{referralRegistered ? "Convite registrado. Aguardando a primeira mensalidade." : "Registre o convite para vincular este escritório ao indicador."}</> : null}
            </p>}
            {couponStatus === "valid" && couponQuote?.kind === "referral" && !referralRegistered &&
              <button type="button" className={styles.secondary} onClick={() => void registerReferral()}>Registrar convite</button>}
            {couponStatus === "invalid" && <p className={styles.warning} role="alert">{couponError}</p>}
          </div>}
          <div className={styles.paymentOptions} role="group" aria-label="Método de pagamento">
            <label><input type="radio" name="billing-payment-preview" checked={paymentMethod === "pix"} onChange={() => setPaymentMethod("pix")} /> Pix (preferencial)</label>
            <label><input type="radio" name="billing-payment-preview" checked={paymentMethod === "boleto"} onChange={() => setPaymentMethod("boleto")} /> Boleto</label>
            <label><input type="radio" name="billing-payment-preview" checked={paymentMethod === "card"} onChange={() => setPaymentMethod("card")} /> Cartão</label>
          </div>
          <p className={styles.help}>Pix costuma confirmar mais rápido, com atualização prevista em até 2h. Boleto pode levar 48h ou mais para compensar, conforme o provedor.</p>
          {comparison.requiresReview && <p className={styles.warning}>Redução não poderá ser concluída enquanto os processos excedentes não forem regularizados. Nenhuma exclusão será automática.</p>}
          <div className={styles.actions}><button type="button" className={styles.secondary} onClick={() => setStep("choose")}>Voltar</button>
            <button type="button" className={styles.disabledButton} disabled>Finalizar pagamento (em breve)</button></div>
        </>}
      </div>
    </div>}
  </div>;
}

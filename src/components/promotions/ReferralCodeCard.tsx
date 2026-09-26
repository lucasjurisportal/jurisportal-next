"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ReferralCodeCard.module.css";

const GOAL = 3;
type Info = {
  code: string;
  pending: number;
  validating: number;
  progress: {
    confirmedFirstPayments: number;
    freeMonthEligible: boolean;
    remainingUntilFreeMonth: number;
  };
  planEligible: boolean;
  settlementEnabled: boolean;
  bonus: {
    period: string;
    unlocked: boolean;
    remainingToUnlock: number;
    monthlyPayments: number;
    estimatedCents: number;
    alreadyPaidCents: number;
    pendingCents: number;
    pendingReview: number;
  };
};

export function ReferralCodeCard() {
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let mounted = true;
    void fetch("/api/referrals/me", { method: "POST" })
      .then(async (response) => {
        if (!response.ok) throw new Error("UNAVAILABLE");
        return response.json() as Promise<Info>;
      })
      .then((data) => { if (mounted) setInfo(data); })
      .catch(() => { if (mounted) setError("Não foi possível carregar seu código. Tente atualizar a página."); });
    return () => { mounted = false; };
  }, []);

  const qualified = Math.min(info?.progress.confirmedFirstPayments ?? 0, GOAL);
  const bonusQualified = Math.min(info?.progress.confirmedFirstPayments ?? 0, 5);
  const brl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  return <section className={styles.card} aria-labelledby="referral-title">
    <div className={styles.header}>
      <div>
        <span className={styles.eyebrow}>Convide outros escritórios</span>
        <h3 id="referral-title">Indique e ganhe</h3>
        <p>Compartilhe seu código. Quem chega por você ganha 10% na primeira mensalidade.</p>
      </div>
      <button type="button" className={styles.explain} onClick={() => dialogRef.current?.showModal()}>
        Como funciona?
      </button>
    </div>

    {info ? <>
      <div className={styles.codeBox}>
        <span>Seu código de convite</span>
        <div className={styles.codeRow}>
          <strong>{info.code}</strong>
          <button type="button" className={styles.copy} onClick={() => {
            if (!navigator.clipboard?.writeText) { setError("Selecione e copie o código acima."); return; }
            void navigator.clipboard.writeText(info.code).then(() => {
              setCopied(true); setError("");
            }).catch(() => setError("Selecione e copie o código acima."));
          }}>{copied ? "Copiado!" : "Copiar"}</button>
        </div>
      </div>
      <div className={styles.progressCard}>
        <div className={styles.progressHeader}>
          <div><span className={styles.progressEyebrow}>Sua meta</span><h4>3 indicações validadas</h4></div>
          <strong className={styles.counter} aria-label={`${qualified} de ${GOAL} indicações validadas`}>
            {qualified}<span>/{GOAL}</span>
          </strong>
        </div>
        <div className={styles.track} role="progressbar" aria-valuemin={0} aria-valuemax={GOAL}
          aria-valuenow={qualified} aria-label="Indicações validadas para o benefício Premium">
          {Array.from({ length: GOAL }, (_, index) => <span key={index} className={index < qualified ? styles.filled : ""} />)}
        </div>
        <p>{qualified < GOAL
          ? `Faltam ${GOAL - qualified} ${GOAL - qualified === 1 ? "indicação validada" : "indicações validadas"} para a meta.`
          : "Meta alcançada. Benefício sujeito à habilitação e conciliação financeira."}</p>
        <div className={styles.chips}>
          <span>{info.pending} aguardando pagamento</span>
          <span>{info.validating} em verificação</span>
        </div>
        {!info.planEligible ? <p className={styles.planNote}>O mês promocional é exclusivo de assinaturas Premium mensais ativas.</p> : null}
        {!info.settlementEnabled ? <p className={styles.planNote}>Os benefícios serão liberados após a integração e a conferência dos pagamentos.</p> : null}
      </div>
      <div className={styles.bonusCard}>
        <div className={styles.bonusTop}>
          <div><span className={styles.progressEyebrow}>Indique e se remunere</span><h4>{info.bonus.unlocked ? "Bônus de indicação" : "Seu próximo objetivo"}</h4></div>
          {info.bonus.unlocked ? <strong className={styles.bonusAmount}>{brl(info.bonus.estimatedCents)}</strong> : null}
        </div>
        {info.bonus.unlocked ? <>
          <p>Você entrou no programa! Cada mensalidade recebida e validada dos seus indicados pode gerar R$ 30.</p>
          <div className={styles.bonusStats}>
            <span><b>{info.bonus.monthlyPayments}</b> mensalidades em apuração neste mês</span>
            <span><b>{brl(info.bonus.pendingCents)}</b> habilitados para apuração</span>
          </div>
        </> : <>
          <p>Alcance cinco indicações validadas para participar da apuração mensal, sem limite de indicados.</p>
          <div className={styles.bonusTrack} role="progressbar" aria-valuemin={0} aria-valuemax={5} aria-valuenow={bonusQualified} aria-label="Indicações validadas para desbloquear o bônus">
            {Array.from({ length: 5 }, (_, index) => <span key={index} className={index < bonusQualified ? styles.bonusFilled : ""} />)}
          </div>
          <small>{bonusQualified}/5 indicações validadas</small>
        </>}
        {info.bonus.unlocked ? <>
          <p className={styles.bonusHint}>O valor exibido é uma projeção, não saldo liberado. Pagamentos precisam cumprir a carência e a conciliação.</p>
          <p className={styles.bonusHint}>Competência {info.bonus.period.slice(5)}/{info.bonus.period.slice(0,4)}. O contador mensal recomeça no mês seguinte; o histórico permanece.</p>
          {!info.settlementEnabled ? <p className={styles.bonusHint}>Apuração e pagamento automático ainda aguardam integração financeira. Nenhum repasse é realizado nesta etapa.</p> : null}
        </> : null}
      </div>
    </> : <p role="status" className={styles.load}>{error || "Preparando seu código..."}</p>}
    {error && info ? <p role="status" className={styles.error}>{error}</p> : null}

    <dialog ref={dialogRef} className={styles.modal} aria-labelledby="referral-rules-title"
      onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }}>
      <div className={styles.modalContent}>
        <div className={styles.modalTop}>
          <h3 id="referral-rules-title">Indique e ganhe, sem complicação</h3>
          <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Fechar explicação">×</button>
        </div>
        <ol className={styles.steps}>
          <li><b>Compartilhe seu código.</b> Cada novo escritório pode receber 10% na primeira mensalidade. Não vale para anuidade.</li>
          <li><b>O convite entra em verificação.</b> Só conta após pagamento confirmado, pelo menos 28 dias de permanência e conferência de cancelamento, estorno ou contestação.</li>
          <li><b>Alcance três indicações válidas.</b> O benefício previsto é uma mensalidade Premium, exclusivamente para assinatura Premium mensal ativa, sujeito à conciliação e à ativação do programa.</li>
        </ol>
        <div className={styles.modalNote}>
          <strong>Por que não conta na hora?</strong>
          <p>Uma assinatura criada ou paga hoje ainda pode ser cancelada. O Jurisportal aguarda a validação financeira antes de preencher sua meta.</p>
        </div>
        <div className={styles.modalNote}>
          <strong>Indique e se remunere</strong>
          <p>Com cinco indicados validados, você poderá acumular R$ 30 por mensalidade elegível paga por cada indicado, sem limite de indicações: cinco mensalidades são R$ 150; dez são R$ 300. A apuração é mensal e o período recomeça no início do mês; a liberação financeira ocorre depois da conciliação e da carência. Anuidades não participam. O mês grátis é benefício separado, exclusivo do Premium mensal.</p>
        </div>
        <p className={styles.footnote}>Os repasses em dinheiro serão disponibilizados apenas após homologação da integração financeira e definição dos dados de recebimento. O painel atual não realiza transferências.</p>
        <button type="button" className={styles.done} onClick={() => dialogRef.current?.close()}>Entendi</button>
      </div>
    </dialog>
  </section>;
}

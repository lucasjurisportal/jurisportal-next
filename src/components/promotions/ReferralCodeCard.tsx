"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ReferralCodeCard.module.css";

const CASH_GOAL = 5;
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

  const count = info?.progress.confirmedFirstPayments ?? 0;
  const cashUnlocked = Boolean(info?.bonus.unlocked);
  const qualified = Math.min(count, CASH_GOAL);
  const brl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
  return <section className={styles.card} aria-labelledby="referral-title">
    <div className={styles.header}>
      <div>
        <span className={styles.eyebrow}>Seu programa de indicações</span>
        <h3 id="referral-title">Indique e Ganhe</h3>
        <p>Convide colegas. Eles economizam 10% na primeira mensalidade; você conquista benefícios.</p>
      </div>
      <button type="button" className={styles.explain} onClick={() => dialogRef.current?.showModal()}>
        Entenda as regras <span aria-hidden="true">↗</span>
      </button>
    </div>

    {info ? <>
      <div className={styles.codeBox}>
        <span>SEU CÓDIGO PESSOAL</span>
        <div className={styles.codeRow}>
          <strong>{info.code}</strong>
          <button type="button" className={styles.copy} onClick={() => {
            if (!navigator.clipboard?.writeText) { setError("Selecione e copie o código acima."); return; }
            void navigator.clipboard.writeText(info.code).then(() => {
              setCopied(true); setError("");
            }).catch(() => setError("Selecione e copie o código acima."));
          }}>{copied ? "✓ Copiado" : "Copiar código"}</button>
        </div>
      </div>
      <div className={styles.rewardPanel}>
        <div className={styles.rewardTop}>
          <div>
            <span className={styles.progressEyebrow}>{cashUnlocked ? "PROGRAMA DESBLOQUEADO" : "SUA JORNADA"}</span>
            <h4>{cashUnlocked ? "Seu bônus mensal" : "Rumo ao bônus de indicação"}</h4>
            <p>{cashUnlocked
              ? "Cada mensalidade elegível dos seus indicados pode render R$ 30."
              : "Acompanhe cada indicação validada e avance para sua próxima conquista."}</p>
          </div>
          <div className={styles.goalFigure} aria-label={`${qualified} de ${CASH_GOAL} indicações qualificadas`}>
            <strong>{qualified}</strong><span>/{CASH_GOAL}</span>
          </div>
        </div>
        <div className={styles.journey} role="progressbar" aria-valuemin={0} aria-valuemax={CASH_GOAL}
          aria-valuenow={qualified} aria-label="Indicações validadas para o programa de remuneração">
          {Array.from({ length: CASH_GOAL }, (_, index) => <span key={index} className={index < qualified ? styles.journeyFilled : ""} />)}
        </div>
        <div className={styles.milestones}>
          <div className={count >= 3 && !cashUnlocked ? styles.milestoneAchieved : styles.milestone}>
            <span aria-hidden="true">{count >= 3 ? "✓" : "①"}</span>
            <div><b>3 indicações</b><small>1 mês Premium*</small></div>
          </div>
          <div className={cashUnlocked ? styles.milestoneAchieved : styles.milestone}>
            <span aria-hidden="true">{cashUnlocked ? "✓" : "②"}</span>
            <div><b>5 indicações</b><small>R$ 30 por mensalidade**</small></div>
          </div>
        </div>
        {cashUnlocked ? <div className={styles.earnings}>
          <span>Projeção de {info.bonus.period.slice(5)}/{info.bonus.period.slice(0, 4)}</span>
          <strong>{brl(info.bonus.estimatedCents)}</strong>
          <small>{info.bonus.monthlyPayments} mensalidades em apuração · não é saldo disponível</small>
        </div> : <p className={styles.goalHint}>
          {count < 3
            ? `Faltam ${3 - count} ${3 - count === 1 ? "indicação qualificada" : "indicações qualificadas"} para a primeira conquista.`
            : info.planEligible
              ? "Meta Premium alcançada! Com 5 indicações, o bônus mensal substitui o benefício de mês grátis."
              : "Primeira meta alcançada! O mês grátis exige Premium mensal; avance para o bônus mensal."}
        </p>}
        <div className={styles.chips}>
          {info.pending > 0 ? <span>{info.pending} aguardando pagamento</span> : null}
          {info.validating > 0 ? <span>{info.validating} em validação</span> : null}
        </div>
        {!info.settlementEnabled ? <p className={styles.disclaimer}>Benefícios financeiros ainda não habilitados. Contagem apenas após validação do pagamento.</p> : null}
      </div>
    </> : <p role="status" className={styles.load}>{error || "Preparando seu código..."}</p>}
    {error && info ? <p role="status" className={styles.error}>{error}</p> : null}

    <dialog ref={dialogRef} className={styles.modal} aria-labelledby="referral-rules-title"
      onClick={(event) => { if (event.target === dialogRef.current) dialogRef.current?.close(); }}>
      <div className={styles.modalContent}>
        <div className={styles.modalTop}>
          <h3 id="referral-rules-title">Como funciona o Indique e Ganhe?</h3>
          <button type="button" className={styles.close} onClick={() => dialogRef.current?.close()} aria-label="Fechar explicação">×</button>
        </div>
        <ol className={styles.steps}>
          <li><b>Compartilhe seu código.</b> Cada novo escritório pode receber 10% na primeira mensalidade. Não vale para anuidade.</li>
          <li><b>O convite entra em verificação.</b> Só conta após pagamento confirmado, pelo menos 28 dias de permanência e conferência de cancelamento, estorno ou contestação.</li>
          <li><b>Alcance três indicações válidas.</b> Entre 3 e 4 indicações, o benefício previsto é uma mensalidade Premium, exclusivamente para assinatura Premium mensal ativa. Ao chegar a 5, você muda de programa e deixa de se enquadrar em novos meses grátis.</li>
        </ol>
        <div className={styles.modalNote}>
          <strong>Por que não conta na hora?</strong>
          <p>Uma assinatura criada ou paga hoje ainda pode ser cancelada. O Jurisportal aguarda a validação financeira antes de preencher sua meta.</p>
        </div>
        <div className={styles.modalNote}>
          <strong>Seu bônus a partir de cinco indicações</strong>
          <p>Com cinco indicados validados, você poderá acumular R$ 30 por mensalidade elegível paga por cada indicado, sem limite de indicações: cinco mensalidades são R$ 150; dez são R$ 300. A apuração é mensal e o período recomeça no início do mês; a liberação financeira ocorre depois da conciliação e da carência. Anuidades não participam. Ao chegar a cinco indicações, a remuneração substitui a elegibilidade ao mês grátis; benefício já efetivamente concedido não é cobrado de volta.</p>
        </div>
        <p className={styles.footnote}>* Mês grátis: somente Premium mensal, quando houver 3 ou 4 indicações qualificadas. ** Remuneração: a partir de 5 indicados qualificados, R$ 30 por mensalidade elegível, com fechamento mensal e carência. Repasses somente após homologação financeira; o painel não faz transferências.</p>
        <button type="button" className={styles.done} onClick={() => dialogRef.current?.close()}>Entendi</button>
      </div>
    </dialog>
  </section>;
}

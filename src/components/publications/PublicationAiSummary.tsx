"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Publications.module.css";

type Summary = {
  id: string;
  result: {
    summary: string;
    keyFacts: string[];
    datesMentioned: Array<{ text: string; context: string }>;
    warnings: string[];
    uncertainties: string[];
  };
  model: string;
  chargedCredits: number;
  createdAt: string;
};

type Props = {
  publicationId: string;
  enabled: boolean;
  estimatedCredits: number;
};

function errorMessage(code: string) {
  if (code === "AI_CREDITS_INSUFFICIENT") return "Seu saldo de créditos não é suficiente para esta análise.";
  if (code === "AI_ACTION_NOT_INCLUDED" || code === "AI_PLAN_UNAVAILABLE") return "Esta ação de IA não está incluída no seu plano.";
  if (code === "AI_PROVIDER_NOT_READY") return "A IA ainda não foi habilitada neste ambiente. A configuração do provedor precisa ser concluída.";
  if (code === "AI_PROVIDER_FAILED") return "O provedor de IA não conseguiu concluir a análise. Nenhum crédito deve ser cobrado por esta tentativa.";
  if (code === "PUBLICATION_CONTENT_EMPTY") return "Esta comunicação não possui texto suficiente para ser resumida.";
  return "Não foi possível gerar o resumo agora. Tente novamente mais tarde.";
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

function CoinIcon() {
  return <svg className={styles.aiCoinIcon} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.7 9.2c.6-1 1.8-1.6 3.3-1.6 1.9 0 3.3.9 3.3 2.2 0 3-6.5 1.1-6.5 4.3 0 1.3 1.4 2.3 3.4 2.3 1.5 0 2.7-.5 3.5-1.5M12 5.8v12.4" />
  </svg>;
}

export function PublicationAiSummary({ publicationId, enabled, estimatedCredits }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void fetch(`/api/ai/publications/${publicationId}/summary`, { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() as Promise<{ summary?: Summary | null }> : null)
      .then((payload) => { if (!cancelled && payload?.summary) setSummary(payload.summary); })
      .finally(() => { if (!cancelled) setLoadingPrevious(false); });
    return () => { cancelled = true; };
  }, [enabled, publicationId]);

  async function generate() {
    setBusy(true);
    setError("");
    try {
      const requestKey = `pubsum:${crypto.randomUUID()}`;
      const response = await fetch(`/api/ai/publications/${publicationId}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestKey }),
      });
      const payload = await response.json().catch(() => null) as { summary?: Summary; error?: string } | null;
      if (!response.ok || !payload?.summary) throw new Error(payload?.error || "AI_SUMMARY_FAILED");
      setSummary(payload.summary);
      router.refresh();
    } catch (cause) {
      setError(errorMessage(cause instanceof Error ? cause.message : "AI_SUMMARY_FAILED"));
    } finally {
      setBusy(false);
    }
  }

  return <section className={styles.aiSummaryCard} aria-label="Resumo assistido por inteligência artificial">
    <div className={styles.aiSummaryHead}>
      <div className={styles.aiCoin}><CoinIcon /></div>
      <div className={styles.aiSummaryTitle}>
        <span>Assistente Jurisportal</span>
        <h3>Resumo com IA</h3>
        <p>Uma leitura assistida da comunicação, sempre sujeita à conferência do advogado.</p>
      </div>
      {enabled ? <button type="button" className={styles.aiSummaryButton} disabled={busy || loadingPrevious} onClick={() => void generate()}>
        {busy ? "Analisando..." : summary ? "Gerar novamente" : "Gerar resumo"}
        <small>{estimatedCredits} crédito(s) estimado(s)</small>
      </button> : <span className={styles.aiLocked}>Disponível a partir do Estratégico</span>}
    </div>

    {error ? <div className={styles.aiError} role="alert">{error}</div> : null}
    {loadingPrevious ? <div className={styles.aiLoading}>Verificando análises anteriores...</div> : null}

    {summary ? <div className={styles.aiResult}>
      <div className={styles.aiResultMeta}><span>Rascunho para revisão</span><span>{summary.chargedCredits} crédito(s) · {dateTime(summary.createdAt)}</span></div>
      <p className={styles.aiLead}>{summary.result.summary}</p>
      {summary.result.keyFacts.length ? <div className={styles.aiResultSection}><strong>Pontos principais</strong><ul>{summary.result.keyFacts.map((fact) => <li key={fact}>{fact}</li>)}</ul></div> : null}
      {summary.result.datesMentioned.length ? <div className={styles.aiResultSection}><strong>Datas mencionadas no texto</strong><ul>{summary.result.datesMentioned.map((item, index) => <li key={`${item.text}-${index}`}><b>{item.text}</b> — {item.context}</li>)}</ul><small>Datas localizadas não são prazos confirmados.</small></div> : null}
      {summary.result.warnings.length ? <div className={styles.aiWarningBlock}><strong>Atenção</strong><ul>{summary.result.warnings.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      {summary.result.uncertainties.length ? <div className={styles.aiUncertainty}><strong>Pontos que precisam de conferência</strong><ul>{summary.result.uncertainties.map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      <p className={styles.aiDisclaimer}>A IA não calcula prazo jurídico definitivo, não substitui o texto integral e não confirma nenhuma ação automaticamente.</p>
    </div> : enabled && !loadingPrevious ? <p className={styles.aiEmpty}>Nenhum resumo de IA foi gerado para esta comunicação.</p> : null}
  </section>;
}

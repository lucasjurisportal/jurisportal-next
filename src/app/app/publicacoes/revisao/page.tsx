import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { normalizeDjenItem } from "@/modules/integrations/djen/domain/djen-publication";
import { listDjenReviewCandidates } from "@/modules/publications/application/djen-review-service";
import { DjenCandidateActions } from "@/components/publications/DjenCandidateActions";
import styles from "@/components/publications/Publications.module.css";

export default async function DjenReviewPage() {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  if (!hasCapability(context.workspace.plan, "djen.monitoring")) redirect("/app/publicacoes");
  if (context.workspace.role !== "owner") {
    return <div className={styles.page}><Link href="/app/publicacoes">← Publicações</Link>
      <p>A revisão de identidade das OABs é exclusiva do proprietário do escritório.</p></div>;
  }
  const candidates = await listDjenReviewCandidates(context.workspace.organizationId);
  return <div className={styles.page}>
    <Link className={styles.back} href="/app/publicacoes">← Publicações e intimações</Link>
    <section className={styles.heading}><div><span className={styles.eyebrow}>DJeN · Para revisão</span>
      <h1>Para revisão</h1>
      <p>Resultados encontrados que precisam de conferência antes de entrar nas publicações do escritório.</p>
    </div></section>
    <p className={styles.muted}>Revise a inscrição, UF, nome completo, texto e fonte oficial antes de confirmar.
      Somente os primeiros 100 candidatos pendentes são exibidos por vez.</p>
    {candidates.length === 0 ? <section className={styles.panel}>Nenhum candidato pendente de identificação.</section> :
      candidates.map((candidate) => {
        const item = normalizeDjenItem(candidate.payload);
        return <section className={styles.panel} id={candidate.id} key={candidate.id}>
          <h2>{item.communicationType} · {item.court || "Tribunal não informado"}</h2>
          <p>OAB cadastrada: {candidate.lawyerOab.rawNumber}/{candidate.lawyerOab.state} · {candidate.lawyerOab.user.name}</p>
          <p>Busca: {candidate.searchMethod === "NAME" ? "Nome completo" : "OAB/UF"} · Verificação: {candidate.reason.replaceAll("_", " ").toLowerCase()}</p>
          <p>Processo: {item.processNumberFormatted || item.processNumberRaw || "Não informado"} · Disponibilização: {item.publicationDate}</p>
          <p>Advogados informados na fonte: {item.lawyers.map((lawyer) => `${lawyer.name} · ${lawyer.oab}/${lawyer.state}`).join("; ") || "Nenhum"}</p>
          <div className={styles.content}>{item.content || "Sem texto informado."}</div>
          {item.sourceUrl ? <p><a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">Abrir link da fonte judicial</a></p> : null}
          <DjenCandidateActions candidateId={candidate.id} />
        </section>;
      })}
  </div>;
}

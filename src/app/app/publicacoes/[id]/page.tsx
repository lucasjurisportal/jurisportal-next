import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import {
  getPublicationActionOptions,
  getPublicationDetail,
  jsonStringArray,
  markPublicationRead,
} from "@/modules/publications/application/publication-service";
import { CopyCnjButton } from "@/components/publications/CopyCnjButton";
import { PublicationActions } from "@/components/publications/PublicationActions";
import { PublicationAiSummary } from "@/components/publications/PublicationAiSummary";
import { planHasCapability } from "@/modules/plans/application/plan-entitlements";
import { estimatePublicationSummaryCredits } from "@/modules/ai/domain/publication-summary";
import styles from "@/components/publications/Publications.module.css";

function dateLabel(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Não informado";
}

function dateInput(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function parties(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is { name: string; role: string } => Boolean(item && typeof item === "object" && "name" in item && "role" in item));
}

export default async function PublicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const { id } = await params;

  let publication = await getPublicationDetail(context.workspace.organizationId, id);
  if (!publication) notFound();
  if (!publication.readAt) {
    await markPublicationRead({ organizationId: context.workspace.organizationId, publicationId: id, actorUserId: context.user.id });
    publication = await getPublicationDetail(context.workspace.organizationId, id);
    if (!publication) notFound();
  }

  const options = await getPublicationActionOptions(context.workspace.organizationId);
  const explicitDates = jsonStringArray(publication.explicitDates);
  const publicationParties = parties(publication.parties);
  const review = publication.deadlineReview;

  return <div className={styles.page}>
    <Link className={styles.back} href="/app/publicacoes">← Voltar para Publicações e intimações</Link>
    <section className={styles.heading}><div><span className={styles.eyebrow}>DJeN · Comunicação</span><h1>{publication.communicationType}</h1><p>{publication.processNumberFormatted || publication.processNumberRaw || "Processo não informado"}</p></div></section>

    <div className={styles.detailGrid}>
      <div className={styles.panel}>
        <div className={styles.statusLine}>
          <span className={publication.kind === "INTIMATION" ? styles.badgeIntimation : styles.badgePublication}>{publication.kind === "INTIMATION" ? "Intimação" : "Publicação"}</span>
          {publication.sourceStatus === "CANCELLED" ? <span className={styles.badgeCancelled}>Cancelada na origem</span> : null}
          {publication.treatedAt ? <span className={styles.badgeTreated}>Tratada</span> : <span className={styles.badgeNew}>Pendente</span>}
          {review?.status === "PENDING_REVIEW" ? <span className={styles.badgeReview}>Revisar prazo</span> : null}
        </div>

        {publication.sourceStatus === "CANCELLED" && publication.cancellationReason ? <div className={styles.error}>Motivo informado pelo DJeN: {publication.cancellationReason}</div> : null}

        <div className={styles.metaGrid}>
          <div className={styles.metaItem}><span>Data de disponibilização</span><strong>{dateLabel(publication.publicationDate)}</strong></div>
          <div className={styles.metaItem}><span>Tribunal</span><strong>{publication.court || "Não informado"}</strong></div>
          <div className={styles.metaItem}><span>Órgão</span><strong>{publication.judicialBody || "Não informado"}</strong></div>
          <div className={styles.metaItem}><span>Documento</span><strong>{publication.documentType || "Não informado"}</strong></div>
          <div className={styles.metaItem}><span>Processo no Jurisportal</span><strong>{publication.process ? <Link className={styles.processLink} href={`/app/processos/${publication.process.id}?tab=publicacoes`}>{publication.process.internalCode} · {publication.process.cnjFormatted}</Link> : "Ainda não vinculado"}</strong></div>
          <div className={styles.metaItem}><span>Origem</span><strong>{publication.source}</strong></div>
        </div>

        <div><h3>OAB(s) identificada(s)</h3><div className={styles.oabList}>{publication.recipients.map((recipient) => <span key={recipient.id}>{recipient.lawyerOab.rawNumber}/{recipient.lawyerOab.state} · {recipient.lawyerOab.user.name}</span>)}</div></div>

        {publicationParties.length ? <div><h3>Destinatários/partes informados</h3><div className={styles.partyList}>{publicationParties.map((party, index) => <span key={`${party.name}-${index}`}>{party.name} · {party.role}</span>)}</div></div> : null}

        {explicitDates.length ? <div><h3>Datas escritas no texto</h3><div className={styles.dates}>{explicitDates.map((date) => <span className={styles.dateChip} key={date}>{date.split("-").reverse().join("/")}</span>)}</div><p className={styles.muted}>São apenas datas localizadas literalmente. O Jurisportal não assume que qualquer uma delas seja o vencimento do prazo.</p></div> : null}

        {context.workspace.plan.slug !== "free" && publication.summary ? <div><h3>Resumo da comunicação</h3><p>{publication.summary}</p>
          <p className={styles.muted}>Trecho fiel do texto original, não é interpretação jurídica nem cálculo de prazo.</p></div> : null}
        <PublicationAiSummary
          publicationId={publication.id}
          enabled={planHasCapability(context.workspace.plan.slug, "ai.publicationSummary")}
          estimatedCredits={estimatePublicationSummaryCredits(publication.content ?? "")}
        />
        {publication.sourceUrl ? <div><a href={publication.sourceUrl} target="_blank" rel="noopener noreferrer">Abrir link da fonte judicial</a></div> : null}
        <div><h3>Conteúdo integral</h3><div className={styles.content}>{publication.content || "Conteúdo não informado pelo DJeN."}</div></div>
      </div>

      <div className={styles.panel}>
        <h2>Ações</h2>
        {!publication.processId && publication.processNumberNormalized?.slice(13, 16) === "826" ? <div className={styles.actionCard}>
          <h3>Consultar no tribunal</h3>
          <p>Abra a consulta unificada do eproc TJSP, escolha a instância e pesquise pelo número CNJ. O número não define sozinho o sistema nem o grau da tramitação.</p>
          <a className={styles.linkButton} href="https://eproc1g.tjsp.jus.br/eproc" target="_blank" rel="noopener noreferrer">Abrir consulta eproc TJSP</a>
          {publication.processNumberNormalized ? <CopyCnjButton cnj={publication.processNumberFormatted ?? publication.processNumberNormalized} /> : null}
        </div> : null}
        <PublicationActions
          processNumberNormalized={publication.processNumberNormalized}
          publicationId={publication.id}
          processId={publication.processId}
          reviewStatus={review?.status ?? null}
          reviewTitle={review?.title ?? (publication.kind === "INTIMATION" ? "Revisar prazo da intimação" : "Revisar prazo da publicação")}
          suggestedDate={dateInput(review?.suggestedDate)}
          treated={Boolean(publication.treatedAt)}
          processes={options.processes}
          members={options.members}
        />
      </div>
    </div>
  </div>;
}

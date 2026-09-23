import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import {
  getPublicationFilters,
  getPublicationSummary,
  jsonStringArray,
  listPublications,
} from "@/modules/publications/application/publication-service";
import { getDjenCaptureStatus, getDjenReviewCount, listDjenReviewCandidates, getDjenRecentUpdates } from "@/modules/publications/application/djen-review-service";
import { DjenCandidateActions } from "@/components/publications/DjenCandidateActions";
import { DjenSyncButton } from "@/components/publications/DjenSyncButton";
import { normalizeDjenItem } from "@/modules/integrations/djen/domain/djen-publication";
import styles from "@/components/publications/Publications.module.css";

const views = [
  ["all", "Todas"],
  ["new", "Novas"],
  ["untreated", "Pendentes"],
  ["treated", "Tratadas"],
  ["with-date", "Com data expressa"],
] as const;

function typeLabel(kind: string) {
  return kind === "INTIMATION" ? "Intimação" : "Publicação";
}

function queryHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) if (value) params.set(key, value);
  return `/app/publicacoes${params.size ? `?${params}` : ""}`;
}

function displayDate(value: Date) {
  return value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default async function PublicationsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");

  const canMonitor = hasCapability(context.workspace.plan, "djen.monitoring");
  if (!canMonitor) {
    return <div className={styles.page}>
      <section className={styles.heading}><div><span className={styles.eyebrow}>DJeN</span><h1>Publicações e intimações</h1><p>Comunicações sem processo vinculado. Após o vínculo, elas ficam na aba Publicações do processo.</p></div></section>
      <section className={styles.locked}><h2>Monitoramento DJeN não está incluído no plano Free</h2><p>O Free mantém clientes, processos, tarefas, prazos e agenda manuais. O monitoramento de publicações começa no Essencial.</p></section>
    </div>;
  }

  const raw = await searchParams;
  const str = (key: string) => typeof raw[key] === "string" ? raw[key] as string : undefined;
  const view = views.some(([key]) => key === str("view")) ? str("view")! : "all";
  const q = str("q") || "";
  const kindRaw = str("kind");
  const kind = kindRaw === "PUBLICATION" || kindRaw === "INTIMATION" ? kindRaw : undefined;
  const lawyerOabId = str("lawyerOabId") || "";
  const responsibleUserId = str("responsibleUserId") || "";
  const page = Math.max(1, Number(str("page") || "1") || 1);

  const [result, summary, filters, reviewCount, captureStatus, reviewCandidates, recentUpdates] = await Promise.all([
    listPublications({
      organizationId: context.workspace.organizationId,
      view,
      query: q || undefined,
      kind,
      lawyerOabId: lawyerOabId || undefined,
      responsibleUserId: responsibleUserId || undefined,
      page,
    }),
    getPublicationSummary(context.workspace.organizationId),
    getPublicationFilters(context.workspace.organizationId),
    context.workspace.role === "owner" ? getDjenReviewCount(context.workspace.organizationId) : Promise.resolve(0),
    context.workspace.role === "owner" ? getDjenCaptureStatus(context.workspace.organizationId) : Promise.resolve([]),
    context.workspace.role === "owner" ? listDjenReviewCandidates(context.workspace.organizationId) : Promise.resolve([]),
    context.workspace.role === "owner" ? getDjenRecentUpdates(context.workspace.organizationId) : Promise.resolve([]),
  ]);

  const current = {
    view,
    q: q || undefined,
    kind,
    lawyerOabId: lawyerOabId || undefined,
    responsibleUserId: responsibleUserId || undefined,
  };
  const showManualSync = context.workspace.role === "owner" &&
    (process.env.NODE_ENV !== "production" || captureStatus.some((cursor) => cursor.status === "ERROR"));
  // Resultados ainda sem identidade confirmada aparecem NO MESMO quadro e filtros das publicações.
  // A fila de identidade pertence ao proprietário; não vaza dados para outros integrantes.
  const visibleCandidates = (page === 1 && ["all", "new", "untreated"].includes(view) ? reviewCandidates : []).flatMap((candidate) => {
    const item = normalizeDjenItem(candidate.payload);
    if (kind && item.kind !== kind) return [];
    if (lawyerOabId && candidate.lawyerOabId !== lawyerOabId) return [];
    if (responsibleUserId && candidate.lawyerOab.userId !== responsibleUserId) return [];
    if (q && ![item.processNumberFormatted, item.processNumberRaw, item.court, item.judicialBody,
      item.content, item.communicationType].some((part) => part?.toLowerCase().includes(q.toLowerCase()))) return [];
    return [{ candidate, item }];
  });

  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>DJeN</span><h1>Publicações e intimações</h1><p>Comunicações reais das OABs monitoradas, vinculadas ao processo quando o número CNJ já existe no Jurisportal.</p></div>
    </section>

    {context.workspace.role === "owner" ? <section className={styles.panel}>
      <h2>Últimas atualizações do DJeN</h2>
      {recentUpdates.length ? recentUpdates.map((update) => <p key={update.day}>
        <strong>{update.day.split("-").reverse().join("/")}</strong> · {update.confirmed} confirmada(s) · {update.pending} para revisão
      </p>) : <p>Nenhuma publicação nova ou resultado para revisão neste período.</p>}
      {captureStatus.filter((status) => status.status === "ERROR" || status.status === "MANUAL_ERROR").map((status) =>
        <p className={styles.error} key={`${status.lawyerOab.rawNumber}/${status.lawyerOab.state}`}>
          Não foi possível concluir a consulta da OAB {status.lawyerOab.rawNumber}/{status.lawyerOab.state}.
          {status.lastError ? ` Código: ${status.lastError}` : ""}
        </p>)}
    </section> : null}

    {showManualSync ? <DjenSyncButton /> : null}

    <section className={styles.summary}>
      <article><span>Total</span><strong>{summary.total + reviewCount}</strong></article>
      <article><span>Novas</span><strong>{summary.unread + reviewCount}</strong></article>
      <article><span>Pendentes</span><strong>{summary.untreated + reviewCount}</strong></article>
      <article><span>Criar prazo?</span><strong>{summary.pendingDeadlineReview}</strong></article>
      <article><span>Canceladas na origem</span><strong>{summary.cancelled}</strong></article>
    </section>

    <nav className={styles.tabs}>{views.map(([key, label]) => <Link key={key} className={view === key ? styles.active : ""} href={queryHref(current, { view: key, page: undefined })}>{label}</Link>)}</nav>

    <form className={styles.toolbar} method="get">
      <input type="hidden" name="view" value={view} />
      <input name="q" defaultValue={q} placeholder="Processo, tribunal, órgão ou texto..." />
      <select name="lawyerOabId" defaultValue={lawyerOabId}><option value="">Todas as OABs</option>{filters.oabs.map((oab) => <option key={oab.id} value={oab.id}>{oab.rawNumber}/{oab.state} · {oab.user.name}</option>)}</select>
      <select name="responsibleUserId" defaultValue={responsibleUserId}><option value="">Todos os advogados</option>{filters.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select>
      <select name="kind" defaultValue={kind ?? ""}><option value="">Publicação e intimação</option><option value="PUBLICATION">Publicação</option><option value="INTIMATION">Intimação</option></select>
      <button className={styles.secondaryButton}>Aplicar</button>
    </form>

    <section className={styles.tablePanel}>
      {result.items.length === 0 && visibleCandidates.length === 0 ? <div className={styles.empty}>Nenhuma comunicação encontrada com estes filtros.</div> : <table className={styles.table}>
        <thead><tr><th>Status</th><th>Comunicação</th><th>Processo</th><th>OAB</th><th>Data</th><th>Ação</th></tr></thead>
        <tbody>{visibleCandidates.map(({ candidate, item }) => <tr key={`candidate:${candidate.id}`} id={candidate.id}>
          <td><div className={styles.statusLine}><span className={item.kind === "INTIMATION" ? styles.badgeIntimation : styles.badgePublication}>{typeLabel(item.kind)}</span><span className={styles.badgeReview}>Para revisão</span></div></td>
          <td><div className={styles.itemTitle}><strong>{item.communicationType}</strong><small>{item.court || "Tribunal não informado"}{item.judicialBody ? ` · ${item.judicialBody}` : ""}</small><span className={styles.snippet}>{item.summary || "Texto disponível em Conferir"}</span></div></td>
          <td><strong>{item.processNumberFormatted || item.processNumberRaw || "Não informado"}</strong><small> · Aguardando confirmação</small></td>
          <td>{candidate.lawyerOab.rawNumber}/{candidate.lawyerOab.state}<small> · {candidate.lawyerOab.user.name}</small></td>
          <td>{displayDate(new Date(`${item.publicationDate}T00:00:00.000Z`))}</td>
          <td><div className={styles.candidateActions}><DjenCandidateActions candidateId={candidate.id} />
            <Link className={styles.linkButton} href={`/app/publicacoes/revisao#${candidate.id}`}>Conferir</Link></div></td>
        </tr>)}{result.items.map((publication) => {
          const dates = jsonStringArray(publication.explicitDates);
          return <tr key={publication.id}>
            <td><div className={styles.statusLine}><span className={publication.kind === "INTIMATION" ? styles.badgeIntimation : styles.badgePublication}>{typeLabel(publication.kind)}</span>{!publication.readAt ? <span className={styles.badgeNew}>Nova</span> : null}{publication.treatedAt ? <span className={styles.badgeTreated}>Tratada</span> : null}{publication.sourceStatus === "CANCELLED" ? <span className={styles.badgeCancelled}>Cancelada</span> : null}{publication.deadlineReview?.status === "PENDING_REVIEW" ? <span className={styles.badgeReview}>Criar prazo?</span> : null}</div></td>
            <td><div className={styles.itemTitle}><strong>{publication.communicationType}</strong><small>{publication.court || "Tribunal não informado"}{publication.judicialBody ? ` · ${publication.judicialBody}` : ""}</small><span className={styles.snippet}>{publication.summary || publication.content || "Conteúdo não informado pelo DJeN."}</span>{dates.length ? <div className={styles.dates}>{dates.slice(0, 3).map((date) => <span className={styles.dateChip} key={date}>{date.split("-").reverse().join("/")}</span>)}</div> : null}</div></td>
            <td>{publication.process ? <div className={styles.itemTitle}><Link className={styles.processLink} href={`/app/processos/${publication.process.id}?tab=publicacoes`}>{publication.process.cnjFormatted}</Link><small>{publication.process.subject || "Sem assunto cadastrado"}</small></div> : <div className={styles.itemTitle}><strong>{publication.processNumberFormatted || publication.processNumberRaw || "Não informado"}</strong><small>Não vinculado ao cadastro</small></div>}</td>
            <td><div className={styles.oabList}>{publication.recipients.map((recipient) => <span key={recipient.id}>{recipient.lawyerOab.rawNumber}/{recipient.lawyerOab.state}<small> · {recipient.lawyerOab.user.name}</small></span>)}</div></td>
            <td>{displayDate(publication.publicationDate)}</td>
            <td><Link className={styles.linkButton} href={`/app/publicacoes/${publication.id}`}>Abrir</Link></td>
          </tr>;
        })}</tbody>
      </table>}
      <div className={styles.pagination}><span>Página {result.page} de {result.pages} · {result.total + (page === 1 ? visibleCandidates.length : 0)} item(ns) exibidos / {result.total + reviewCount} no escritório</span><div>{result.page > 1 ? <Link href={queryHref(current, { page: String(result.page - 1) })}>← Anterior</Link> : null}{result.page < result.pages ? <Link style={{ marginLeft: 14 }} href={queryHref(current, { page: String(result.page + 1) })}>Próxima →</Link> : null}</div></div>
    </section>
  </div>;
}

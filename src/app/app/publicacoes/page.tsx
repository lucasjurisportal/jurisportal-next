import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";
import {
  getPublicationFilters,
  getPublicationSummary,
  jsonStringArray,
  listPublications,
} from "@/modules/publications/application/publication-service";
import { DjenSyncButton } from "@/components/publications/DjenSyncButton";
import styles from "@/components/publications/Publications.module.css";

const views = [
  ["all", "Todas"],
  ["new", "Novas"],
  ["untreated", "Não tratadas"],
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
      <section className={styles.heading}><div><span className={styles.eyebrow}>DJeN</span><h1>Publicações e intimações</h1><p>Comunicações das OABs monitoradas ficam centralizadas neste módulo.</p></div></section>
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

  const [result, summary, filters, platformMaster] = await Promise.all([
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
    isPlatformMaster(context.user.id),
  ]);

  const current = {
    view,
    q: q || undefined,
    kind,
    lawyerOabId: lawyerOabId || undefined,
    responsibleUserId: responsibleUserId || undefined,
  };
  const showManualSync = process.env.NODE_ENV !== "production" || platformMaster;

  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>DJeN</span><h1>Publicações e intimações</h1><p>Comunicações reais das OABs monitoradas, vinculadas ao processo quando o número CNJ já existe no Jurisportal.</p></div>
    </section>

    {showManualSync ? <DjenSyncButton /> : null}

    <section className={styles.summary}>
      <article><span>Total</span><strong>{summary.total}</strong></article>
      <article><span>Novas</span><strong>{summary.unread}</strong></article>
      <article><span>Não tratadas</span><strong>{summary.untreated}</strong></article>
      <article><span>Revisar prazo</span><strong>{summary.pendingDeadlineReview}</strong></article>
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
      {result.items.length === 0 ? <div className={styles.empty}>Nenhuma comunicação encontrada com estes filtros.</div> : <table className={styles.table}>
        <thead><tr><th>Status</th><th>Comunicação</th><th>Processo</th><th>OAB</th><th>Data</th><th>Ação</th></tr></thead>
        <tbody>{result.items.map((publication) => {
          const dates = jsonStringArray(publication.explicitDates);
          return <tr key={publication.id}>
            <td><div className={styles.statusLine}><span className={publication.kind === "INTIMATION" ? styles.badgeIntimation : styles.badgePublication}>{typeLabel(publication.kind)}</span>{!publication.readAt ? <span className={styles.badgeNew}>Nova</span> : null}{publication.treatedAt ? <span className={styles.badgeTreated}>Tratada</span> : null}{publication.sourceStatus === "CANCELLED" ? <span className={styles.badgeCancelled}>Cancelada</span> : null}{publication.deadlineReview?.status === "PENDING_REVIEW" ? <span className={styles.badgeReview}>Revisar prazo</span> : null}</div></td>
            <td><div className={styles.itemTitle}><strong>{publication.communicationType}</strong><small>{publication.court || "Tribunal não informado"}{publication.judicialBody ? ` · ${publication.judicialBody}` : ""}</small><span className={styles.snippet}>{publication.content || "Conteúdo não informado pelo DJeN."}</span>{dates.length ? <div className={styles.dates}>{dates.slice(0, 3).map((date) => <span className={styles.dateChip} key={date}>{date.split("-").reverse().join("/")}</span>)}</div> : null}</div></td>
            <td>{publication.process ? <div className={styles.itemTitle}><Link className={styles.processLink} href={`/app/processos/${publication.process.id}?tab=publicacoes`}>{publication.process.cnjFormatted}</Link><small>{publication.process.subject || "Sem assunto cadastrado"}</small></div> : <div className={styles.itemTitle}><strong>{publication.processNumberFormatted || publication.processNumberRaw || "Não informado"}</strong><small>Não vinculado ao cadastro</small></div>}</td>
            <td><div className={styles.oabList}>{publication.recipients.map((recipient) => <span key={recipient.id}>{recipient.lawyerOab.rawNumber}/{recipient.lawyerOab.state}<small> · {recipient.lawyerOab.user.name}</small></span>)}</div></td>
            <td>{displayDate(publication.publicationDate)}</td>
            <td><Link className={styles.linkButton} href={`/app/publicacoes/${publication.id}`}>Abrir</Link></td>
          </tr>;
        })}</tbody>
      </table>}
      <div className={styles.pagination}><span>Página {result.page} de {result.pages} · {result.total} comunicação(ões)</span><div>{result.page > 1 ? <Link href={queryHref(current, { page: String(result.page - 1) })}>← Anterior</Link> : null}{result.page < result.pages ? <Link style={{ marginLeft: 14 }} href={queryHref(current, { page: String(result.page + 1) })}>Próxima →</Link> : null}</div></div>
    </section>
  </div>;
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getProcessAreaOptions, getProcessCounts, getProcessResponsibleOptions, listProcesses } from "@/modules/processes/application/process-service";
import { normalizedAreaFilter, UNCLASSIFIED_PROCESS_AREA } from "@/modules/processes/domain/process-area";
import areaStyles from "@/components/processes/ProcessAreaFilter.module.css";
import styles from "@/components/processes/Processes.module.css";
import { buildProcessDisplayReference, selectOpposingPartyName } from "@/modules/processes/domain/process-reference";

function hrefWithPage(current: URLSearchParams, page: number) {
  const params = new URLSearchParams(current);
  params.set("page", String(page));
  return `/app/processos?${params.toString()}`;
}

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "CLOSED") return "Encerrado";
  if (status === "ARCHIVED") return "Arquivado";
  if (status === "FOUND") return "Encontrado";
  return status;
}

export default async function ProcessesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q : "";
  const status = raw.status === "ACTIVE" || raw.status === "CLOSED" || raw.status === "ARCHIVED" || raw.status === "FOUND" ? raw.status : undefined;
  const responsibleUserId = typeof raw.responsibleUserId === "string" ? raw.responsibleUserId : undefined;
  const caseType = normalizedAreaFilter(typeof raw.caseType === "string" ? raw.caseType : undefined);
  const parsedPage = typeof raw.page === "string" ? Number(raw.page) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [result, counts, responsibleOptions, areaOptions] = await Promise.all([
    listProcesses({ organizationId: context.workspace.organizationId, page, query: q || undefined, status, responsibleUserId, caseType }),
    getProcessCounts(context.workspace.organizationId),
    getProcessResponsibleOptions(context.workspace.organizationId),
    getProcessAreaOptions(context.workspace.organizationId),
  ]);

  const current = new URLSearchParams();
  if (q) current.set("q", q);
  if (status) current.set("status", status);
  if (responsibleUserId) current.set("responsibleUserId", responsibleUserId);
  if (caseType) current.set("caseType", caseType);

  const limit = context.workspace.plan.registeredProcessLimit;
  const usageText = limit === "unlimited" ? `${counts.total} processos` : `${counts.total} / ${limit}`;

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <div><span className={styles.eyebrow}>Gestão processual</span><h1>Processos</h1><p>Cadastre, vincule clientes, defina responsáveis e mantenha o histórico central de cada processo.</p></div>
        <Link className={styles.primaryButton} href="/app/processos/novo">+ Novo processo</Link>
      </section>

      <section className={styles.summary}>
        <div className={styles.summaryCard}><strong>{counts.active}</strong><span>ativos</span></div>
        <div className={styles.summaryCard}><strong>{counts.closed}</strong><span>encerrados</span></div>
        <div className={styles.summaryCard}><strong>{counts.archived}</strong><span>arquivados</span></div>
        <div className={styles.summaryCard}><strong>{counts.found}</strong><span>encontrados</span></div>
        <div className={styles.summaryCard}><strong>{usageText}</strong><span>uso do plano</span></div>
      </section>

      <form className={`${styles.toolbar} ${areaStyles.areaToolbar}`} method="get">
        <input name="q" defaultValue={q} aria-label="Pesquisar processos" placeholder="Buscar referência, CNJ, cliente, parte, assunto..." />
        <select name="status" defaultValue={status ?? ""} aria-label="Filtrar por status"><option value="">Todos os status</option><option value="ACTIVE">Ativos</option><option value="CLOSED">Encerrados</option><option value="ARCHIVED">Arquivados</option><option value="FOUND">Encontrados</option></select>
        <select name="responsibleUserId" defaultValue={responsibleUserId ?? ""} aria-label="Filtrar por responsável"><option value="">Todos os responsáveis</option>{responsibleOptions.map((member) => <option key={member.id} value={member.user.id}>{member.user.name}</option>)}</select>
        <select name="caseType" defaultValue={caseType ?? ""} aria-label="Filtrar por área do Direito">
          <option value="">Todas as áreas</option>
          {areaOptions.classified.map((area) => <option key={area.label} value={area.label}>{area.label} ({area.count})</option>)}
          {areaOptions.unclassified > 0 || caseType === UNCLASSIFIED_PROCESS_AREA ? <option value={UNCLASSIFIED_PROCESS_AREA}>Sem área definida ({areaOptions.unclassified})</option> : null}
        </select>
        <div className={areaStyles.areaActions}>
          <button className={styles.secondaryButton} type="submit">Filtrar</button>
          {q || status || responsibleUserId || caseType ? <Link className={areaStyles.clearFilter} href="/app/processos">Limpar</Link> : null}
        </div>
      </form>

      <section className={styles.tablePanel}>
        {result.items.length === 0 ? (
          <div className={styles.empty}><strong>Nenhum processo encontrado.</strong><p>Cadastre o primeiro processo ou ajuste os filtros.</p><Link className={styles.primaryButton} href="/app/processos/novo">Cadastrar processo</Link></div>
        ) : (
          <table className={styles.table}>
            <thead><tr><th>Processo</th><th>Cliente(s)</th><th>Tribunal</th><th>Responsável</th><th>Status</th><th></th></tr></thead>
            <tbody>{result.items.map((process) => (
              <tr key={process.id}>
                <td><div className={styles.processNumber}><strong>{buildProcessDisplayReference({ internalCode: process.internalCode, primaryClientName: process.clients[0]?.client.tradeName || process.clients[0]?.client.name, opposingPartyName: selectOpposingPartyName({ representedClients: process.clients.flatMap((link) => [{ name: link.client.tradeName || link.client.name, partyRole: link.partyRole }, ...(link.client.tradeName ? [{ name: link.client.name, partyRole: link.partyRole }] : [])]), otherParties: process.parties }) })}</strong><span>CNJ {process.cnjFormatted}</span><span>{[process.caseType, process.processClass, process.subject].filter(Boolean).join(" · ") || "Sem classificação"}</span></div></td>
                <td>{process.clients.slice(0,2).map((link) => link.client.tradeName || link.client.name).join(", ")}{process.clients.length > 2 ? ` +${process.clients.length - 2}` : ""}</td>
                <td>{process.court || "—"}{process.division ? <><br/><span className={styles.muted}>{process.division}</span></> : null}</td>
                <td>{process.responsible?.name || "Não definido"}</td>
                <td><span className={`${styles.tag} ${process.status === "CLOSED" ? styles.tagClosed : process.status === "ARCHIVED" ? styles.tagArchived : process.status === "FOUND" ? styles.tagFound : ""}`}>{statusLabel(process.status)}</span></td>
                <td><Link className={styles.textLink} href={`/app/processos/${process.id}`}>Abrir</Link></td>
              </tr>
            ))}</tbody>
          </table>
        )}
        <div className={styles.pagination}><span>Página {result.page} de {result.totalPages} · {result.total} resultado(s)</span><div className={styles.paginationNav}>{result.page > 1 ? <Link href={hrefWithPage(current, result.page - 1)}>← Anterior</Link> : null}{result.page < result.totalPages ? <Link href={hrefWithPage(current, result.page + 1)}>Próxima →</Link> : null}</div></div>
      </section>
      <p className={styles.quotaNote}>Arquivar ou encerrar um processo não libera automaticamente a vaga do plano.</p>
    </div>
  );
}

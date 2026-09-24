import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getProcess } from "@/modules/processes/application/process-service";
import { getProcessWorkspaceData } from "@/modules/processes/application/process-workspace-service";
import { ProcessStatusActions } from "@/components/processes/ProcessStatusActions";
import { ProcessPermanentDelete } from "@/components/processes/ProcessPermanentDelete";
import { ProcessManualEventForm } from "@/components/processes/ProcessManualEventForm";
import { ProcessWorkItemForm } from "@/components/processes/ProcessWorkItemForm";
import { ProcessWorkItemStatusButton } from "@/components/processes/ProcessWorkItemStatusButton";
import { ProcessFeeAgreementForm, ProcessFinanceEntryForm } from "@/components/processes/ProcessFinanceForms";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";
import { listProcessPublications } from "@/modules/publications/application/publication-service";
import styles from "@/components/processes/Processes.module.css";
import pubStyles from "@/components/publications/Publications.module.css";
import { buildProcessDisplayReference } from "@/modules/processes/domain/process-reference";
import { auditActionLabel, auditCategoryLabel, operationalSourceLabel } from "@/shared/audit/audit-labels";
import { listProcessDocuments } from "@/modules/documents/application/document-service";
import { ProcessDocuments } from "@/components/documents/ProcessDocuments";
import { ExternalProcessMovements } from "@/components/processes/ExternalProcessMovements";
import { isProcessLookupEnabled } from "@/modules/integrations/process-metadata/infrastructure/datajud-client";
import { listSavedProcessMovements } from "@/modules/integrations/process-metadata/application/sync-process-movements";

const TABS = ["visao", "timeline", "movimentacoes", "publicacoes", "prazos", "documentos", "financeiro", "historico"] as const;
type Tab = (typeof TABS)[number];

function statusLabel(status: string) {
  if (status === "ACTIVE") return "Ativo";
  if (status === "CLOSED") return "Encerrado";
  if (status === "ARCHIVED") return "Arquivado";
  if (status === "FOUND") return "Encontrado";
  return status;
}

function kindLabel(kind: string) {
  if (kind === "DEADLINE") return "Prazo";
  if (kind === "TASK") return "Tarefa";
  return kind;
}

function financeKindLabel(kind: string) {
  if (kind === "FEE_RECEIPT") return "Honorário";
  if (kind === "COST") return "Custa / despesa";
  if (kind === "REIMBURSEMENT") return "Reembolso";
  return kind;
}

function money(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function dateOnly(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Sem data";
}

function tabHref(id: string, tab: Tab) {
  return `/app/processos/${id}?tab=${tab}`;
}

export default async function ProcessDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const { id } = await params;
  const query = await searchParams;
  const tab = TABS.includes(query.tab as Tab) ? (query.tab as Tab) : "visao";

  const [process, workspace, processPublications] = await Promise.all([
    getProcess(context.workspace.organizationId, id),
    getProcessWorkspaceData(context.workspace.organizationId, id),
    listProcessPublications(context.workspace.organizationId, id),
  ]);
  if (!process) notFound();
  const savedMovements = tab === "movimentacoes" ? await listSavedProcessMovements(context.workspace.organizationId, id) : [];
  const documentsData = tab === "documentos" ? await listProcessDocuments({
    organizationId: context.workspace.organizationId, processId: id,
    planGb: context.workspace.plan.storageLimitGb,
  }) : null;

  const canPermanentlyDelete =
    context.workspace.organizationSlug === "jurisportal-internal" &&
    (await isPlatformMaster(context.user.id));

  const memberOptions = workspace.members.map((membership) => ({
    id: membership.user.id,
    name: membership.user.name,
    email: membership.user.email,
  }));
  const openWorkItems = workspace.workItems.filter((item) => item.status === "OPEN");
  const deadlines = openWorkItems.filter((item) => item.kind === "DEADLINE");
  const tasks = openWorkItems.filter((item) => item.kind === "TASK");
  const agreement = workspace.feeAgreement;
  const primaryClient = process.clients.find((item) => item.isPrimary)?.client ?? process.clients[0]?.client;
  const processReference = buildProcessDisplayReference({
    internalCode: process.internalCode,
    primaryClientName: primaryClient?.tradeName || primaryClient?.name,
    opposingPartyName: process.parties[0]?.name,
  });

  return (
    <div className={styles.page}>
      <section className={styles.detailHeader}>
        <div className={styles.detailTitle}>
          <span className={styles.eyebrow}>Processo</span>
          <h1>{processReference}</h1>
          <span className={styles.muted}>CNJ {process.cnjFormatted} · {process.processClass || "Ação não informada"} · {statusLabel(process.status)}</span>
        </div>
        <div className={styles.detailActions}>
          <Link className={styles.secondaryButton} href="/app/processos">← Voltar</Link>
          <Link className={styles.primaryButton} href={`/app/processos/${process.id}/editar`}>Editar processo</Link>
          <ProcessStatusActions processId={process.id} status={process.status} />
        </div>
      </section>

      <section className={styles.processHeadlineData}>
        <div><span>Status</span><strong>{statusLabel(process.status)}</strong></div>
        <div><span>Tribunal</span><strong>{process.court || "Não informado"}</strong></div>
        <div><span>Vara</span><strong>{process.division || "Não informada"}</strong></div>
        <div><span>Responsável</span><strong>{process.responsible?.name || "Não definido"}</strong></div>
        <div><span>Cliente principal</span><strong>{process.clients.find((item) => item.isPrimary)?.client.tradeName || process.clients.find((item) => item.isPrimary)?.client.name || "Não definido"}</strong></div>
        <div><span>Pendências</span><strong>{openWorkItems.length}</strong></div>
      </section>

      <nav className={styles.tabs}>
        {[
          ["visao", "Visão geral"], ["timeline", "Linha do tempo"], ["movimentacoes", "Movimentações"], ["publicacoes", "Publicações"],
          ["prazos", "Prazos e tarefas"], ["documentos", "Documentos"], ["financeiro", "Financeiro"], ["historico", "Histórico"],
        ].map(([key, label]) => <Link key={key} href={tabHref(process.id, key as Tab)} className={tab === key ? styles.tab : styles.tabLink}>{label}</Link>)}
      </nav>

      {tab === "visao" ? <>
        <div className={styles.processOverviewGrid}>
          <section className={styles.panel}><span className={styles.eyebrow}>Dados processuais</span><div className={styles.facts}>
            <div className={styles.fact}><span>Referência interna</span><strong>{process.internalCode}</strong></div>
            <div className={styles.fact}><span>Número CNJ</span><strong>{process.cnjFormatted}</strong></div>
            <div className={styles.fact}><span>Tipo / área</span><strong>{process.caseType || "Não informado"}</strong></div>
            <div className={styles.fact}><span>Ação / procedimento</span><strong>{process.processClass || "Não informado"}</strong></div>
            <div className={styles.fact}><span>Assunto principal</span><strong>{process.subject || "Não identificado"}</strong></div>
            <div className={styles.fact}><span>Outros assuntos</span><strong>{process.otherSubjects.length ? process.otherSubjects.join(" · ") : "Nenhum informado"}</strong></div>
            <div className={styles.fact}><span>Distribuição</span><strong>{dateOnly(process.distributionDate)}</strong></div>
            <div className={styles.fact}><span>Comarca</span><strong>{process.district || "Não informada"}</strong></div>
            <div className={styles.fact}><span>Fórum</span><strong>{process.forum || "Não informado"}</strong></div>
            <div className={styles.fact}><span>Valor da causa</span><strong>{process.caseValue ? money(Number(process.caseValue.toString())) : "Não informado"}</strong></div>
          </div>{process.notes ? <p className={styles.muted}>{process.notes}</p> : null}</section>

          <section className={styles.panel}><span className={styles.eyebrow}>Partes vinculadas</span><h2>Clientes representados</h2><div className={styles.chips}>{process.clients.map((link) => <Link key={link.id} className={styles.chip} href={`/app/clientes/${link.clientId}/editar`}>{link.client.tradeName || link.client.name}{link.isPrimary ? " · principal" : ""}</Link>)}</div><h2>Outras partes</h2>{process.parties.length === 0 ? <span className={styles.muted}>Nenhuma outra parte cadastrada.</span> : <div className={styles.chips}>{process.parties.map((party) => <span className={styles.chip} key={party.id}>{party.role}: {party.name}</span>)}</div>}</section>

          <section className={`${styles.panel} ${styles.attentionPanel}`}><span className={styles.eyebrow}>Precisa de atenção</span>{openWorkItems.length === 0 ? <p className={styles.muted}>Nenhum prazo ou tarefa pendente neste processo.</p> : <div className={styles.attentionItems}>{deadlines.slice(0, 2).map((item) => <Link href={tabHref(process.id, "prazos")} key={item.id}><strong>{item.title}</strong><span>{dateOnly(item.dueDate)}{item.dueTime ? ` · ${item.dueTime}` : ""}{item.isFatal ? " · Fatal" : ""}</span></Link>)}{tasks.slice(0, 2).map((item) => <Link href={tabHref(process.id, "prazos")} key={item.id}><strong>{item.title}</strong><span>Tarefa · {dateOnly(item.dueDate)}</span></Link>)}</div>}</section>

          <section className={styles.panel}><span className={styles.eyebrow}>Última movimentação interna</span>{process.timeline[0] ? <div className={styles.lastMovement}><strong>{process.timeline[0].title}</strong><span>{process.timeline[0].eventDate.toLocaleString("pt-BR")} · {process.timeline[0].source}</span>{process.timeline[0].description ? <p>{process.timeline[0].description}</p> : null}</div> : <p className={styles.muted}>Nenhum evento registrado.</p>}<Link className={styles.textLink} href={tabHref(process.id, "timeline")}>Ver linha do tempo completa</Link></section>
        </div>
      </> : null}

      {tab === "timeline" ? <section className={styles.panel}>
        <div className={styles.processPanelHead}><div><span className={styles.eyebrow}>Histórico operacional</span><h2>Linha do tempo</h2><p>Eventos do processo em ordem cronológica, independentemente da origem.</p></div><ProcessManualEventForm processId={process.id} /></div>
        <div className={styles.timeline}>{process.timeline.length === 0 ? <span className={styles.muted}>Nenhum evento registrado.</span> : process.timeline.map((event) => <div key={event.id} className={styles.timelineItem}><time>{event.eventDate.toLocaleString("pt-BR")}</time><div><strong>{event.title}</strong>{event.description ? <p>{event.description}</p> : null}<span className={styles.muted}>{event.createdBy?.name || "Sistema"} · {operationalSourceLabel(event.source)}</span></div></div>)}</div>
      </section> : null}

      {tab === "movimentacoes" ? <ExternalProcessMovements processId={process.id} initialItems={savedMovements} lookupEnabled={isProcessLookupEnabled()} /> : null}

      {tab === "publicacoes" ? <section className={styles.panel}>
        <div className={styles.processPanelHead}><div><span className={styles.eyebrow}>DJeN</span><h2>Publicações e intimações</h2><p>Comunicações reais vinculadas a este CNJ.</p></div><Link className={styles.secondaryButton} href="/app/publicacoes">Abrir central de publicações</Link></div>
        {processPublications.length === 0 ? <div className={styles.empty}><p>Nenhuma publicação ou intimação vinculada a este processo.</p></div> : <div className={styles.workItemList}>{processPublications.map((publication) => <article key={publication.id} className={styles.workItem}>
          <div><span className={publication.kind === "INTIMATION" ? pubStyles.badgeIntimation : pubStyles.badgePublication}>{publication.kind === "INTIMATION" ? "Intimação" : "Publicação"}</span><strong>{publication.communicationType}</strong><p>{dateOnly(publication.publicationDate)} · {publication.court || "Tribunal não informado"}{publication.judicialBody ? ` · ${publication.judicialBody}` : ""}</p><small>{publication.summary || publication.content.slice(0, 220)}</small></div>
          <div className={styles.workItemRight}>{publication.deadlineReview?.status === "PENDING_REVIEW" ? <span className={pubStyles.badgeReview}>Revisar prazo</span> : null}<Link className={styles.secondaryButton} href={`/app/publicacoes/${publication.id}`}>Abrir</Link></div>
        </article>)}</div>}
      </section> : null}

      {tab === "prazos" ? <section className={styles.panel}>
        <div className={styles.processPanelHead}><div><span className={styles.eyebrow}>Execução</span><h2>Prazos e tarefas</h2><p>Itens operacionais reais vinculados ao processo.</p></div><ProcessWorkItemForm processId={process.id} members={memberOptions} /></div>
        {workspace.workItems.length === 0 ? <div className={styles.empty}><p>Nenhum prazo ou tarefa cadastrado.</p></div> : <div className={styles.workItemList}>{workspace.workItems.map((item) => <article key={item.id} className={item.status === "DONE" ? styles.workItemDone : styles.workItem}>
          <div><span className={item.kind === "DEADLINE" ? styles.kindDeadline : styles.kindTask}>{kindLabel(item.kind)}</span><strong>{item.title}</strong><p>{dateOnly(item.dueDate)}{item.dueTime ? ` · ${item.dueTime}` : ""} · {item.responsible?.name || "Sem responsável"}{item.isFatal ? " · Fatal" : ""}</p>{item.notes ? <small>{item.notes}</small> : null}</div>
          <div className={styles.workItemRight}><span>{item.status === "DONE" ? "Concluído" : item.priority === "HIGH" ? "Prioridade alta" : "Pendente"}</span><ProcessWorkItemStatusButton processId={process.id} workItemId={item.id} status={item.status} /></div>
        </article>)}</div>}
      </section> : null}

            {tab === "documentos" ? (
        <section className={styles.panel}>
          <div className={styles.processPanelHead}>
            <div>
              <span className={styles.eyebrow}>Arquivos</span>
              <h2>Documentos</h2>
              <p>
                PDFs privados vinculados ao processo, com quota e histórico
                de alterações.
              </p>
            </div>
          </div>

          {documentsData ? (
            <ProcessDocuments
              processId={process.id}
              canManage={context.workspace.role === "owner"}
              initial={{
                documents: documentsData.documents.map((doc) => ({
                  ...doc,
                  createdAt: doc.createdAt.toISOString(),
                  deletedAt: doc.deletedAt?.toISOString() ?? null,
                })),
                storage: documentsData.storage,
                permanentDeletionEnabled:
                  documentsData.permanentDeletionEnabled,
              }}
            />
          ) : null}
        </section>
      ) : null}


      {tab === "financeiro" ? <div className={styles.financeStack}>
        <section className={styles.legalFinanceMetrics}>
          <article><span>Honorário contratado</span><strong>{money(workspace.financeSummary.contracted)}</strong><small>valor histórico contratado</small></article>
          <article><span>Recebido</span><strong>{money(workspace.financeSummary.received)}</strong><small>honorários marcados como recebidos</small></article>
          <article><span>A receber</span><strong>{money(workspace.financeSummary.receivable)}</strong><small>diferença do contratado</small></article>
          <article><span>Custas lançadas</span><strong>{money(workspace.financeSummary.costs)}</strong><small>custas e despesas do caso</small></article>
        </section>
        <section className={styles.panel}><div className={styles.processPanelHead}><div><span className={styles.eyebrow}>Financeiro jurídico</span><h2>Financeiro do processo</h2><p>Honorários, custas e reembolsos. Não substitui contabilidade.</p></div><ProcessFinanceEntryForm processId={process.id} /></div>
          <ProcessFeeAgreementForm processId={process.id} caseValue={process.caseValue ? Number(process.caseValue.toString()) : null} initial={{ model: agreement?.model ?? "FIXED", fixedAmount: agreement?.fixedAmount ? Number(agreement.fixedAmount.toString()) : null, contractedAmount: agreement?.contractedAmount ? Number(agreement.contractedAmount.toString()) : null, successPercentage: agreement?.successPercentage ? Number(agreement.successPercentage.toString()) : null, successBase: agreement?.successBase ?? "", notes: agreement?.notes ?? "" }} />
          <div className={styles.financeEntries}>{workspace.financeEntries.length === 0 ? <p className={styles.muted}>Nenhum lançamento financeiro.</p> : workspace.financeEntries.map((entry) => <article key={entry.id}><div><span className={styles.kindFinance}>{financeKindLabel(entry.kind)}</span><strong>{entry.description}</strong><small>{dateOnly(entry.entryDate)} · {entry.status === "PAID" ? "Pago/recebido" : "Pendente"}{entry.paidBy ? ` · ${entry.paidBy}` : ""}{entry.reimbursable ? " · Reembolsável" : ""}</small></div><strong>{money(Number(entry.amount.toString()))}</strong></article>)}</div>
        </section>
      </div> : null}

      {tab === "historico" ? <section className={styles.panel}>
        <div className={styles.processPanelHead}><div><span className={styles.eyebrow}>Auditoria</span><h2>Histórico de alterações</h2><p>Mudanças relevantes feitas por usuários ou integrações.</p></div></div>
        <div className={styles.auditList}>{workspace.auditEvents.length === 0 ? <span className={styles.muted}>Nenhum evento de auditoria para este processo.</span> : workspace.auditEvents.map((event) => <article key={event.id}><strong>{auditActionLabel(event.action)}</strong><span>{event.actor?.name || "Sistema"} · {event.createdAt.toLocaleString("pt-BR")}</span><p>{auditCategoryLabel(event.category)}</p></article>)}</div>
      </section> : null}

      {canPermanentlyDelete ? <ProcessPermanentDelete processId={process.id} cnj={process.cnjFormatted} /> : null}
    </div>
  );
}

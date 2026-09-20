import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { getReportData, getReportUserOptions } from "@/modules/reports/application/report-service";
import { resolveReportPeriod, reportPeriodLabel } from "@/modules/reports/domain/report-period";
import { financeKindLabel, financeStatusLabel, processStatusLabel, publicationStatusLabel, workKindLabel, workStatusLabel } from "@/modules/reports/domain/report-labels";
import { auditActionLabel, auditCategoryLabel } from "@/shared/audit/audit-labels";
import { ReportActions } from "@/components/reports/ReportActions";
import styles from "@/components/reports/Reports.module.css";

function brDate(value: Date | null | undefined) {
  return value ? value.toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Sem data";
}

function brDateTime(value: Date | null | undefined) {
  return value ? value.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";
}

function brMoney(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function param(raw: Record<string, string | string[] | undefined>, key: string) {
  return typeof raw[key] === "string" ? raw[key] as string : undefined;
}

function exportHref(type: string, period: { preset: string; from: string; to: string }, userId?: string) {
  const query = new URLSearchParams({ type, preset: period.preset, from: period.from, to: period.to });
  if (userId) query.set("userId", userId);
  return `/api/reports/export?${query.toString()}`;
}

function durationLabel(minutes: number | null) {
  if (minutes == null) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return `${hours}h ${String(rest).padStart(2, "0")}min`;
}

function badgeClass(label: string) {
  if (["Ativo", "Concluído", "Tratada", "Pago / recebido"].includes(label)) return `${styles.badge} ${styles.badgeGood}`;
  if (["Nova", "Pendente", "Lida"].includes(label)) return `${styles.badge} ${styles.badgeWarn}`;
  if (["Cancelada na origem", "Arquivado"].includes(label)) return `${styles.badge} ${styles.badgeDanger}`;
  return styles.badge;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  if (context.workspace.role !== "owner") redirect("/app/dashboard");

  if (!hasCapability(context.workspace.plan, "reports.basic")) {
    return <div className={styles.page}>
      <section className={styles.heading}><div><span className={styles.eyebrow}>Relatórios</span><h1>Relatórios do escritório</h1><p>Relatórios começam no plano Essencial e utilizam somente os dados reais já registrados no Jurisportal.</p></div></section>
      <section className={styles.restricted}><h2>Recurso não incluído no plano atual</h2><p>O plano Free mantém os módulos operacionais básicos, mas não libera a central de relatórios.</p><Link className={styles.primaryButton} href="/app/plano">Ver plano e cobrança</Link></section>
    </div>;
  }

  const raw = await searchParams;
  const period = resolveReportPeriod({ preset: param(raw, "preset"), from: param(raw, "from"), to: param(raw, "to") });
  const users = await getReportUserOptions(context.workspace.organizationId);
  const requestedUserId = param(raw, "userId");
  const selectedUser = requestedUserId ? users.find((user) => user.id === requestedUserId) : undefined;
  const userId = selectedUser?.id;
  const canAdvanced = hasCapability(context.workspace.plan, "reports.advanced");
  const canTeam = hasCapability(context.workspace.plan, "team.activity");
  const data = await getReportData({ organizationId: context.workspace.organizationId, period, includeAdvanced: canAdvanced, includeTeamActivity: canTeam, userId });
  const periodParams = { preset: period.preset, from: period.from, to: period.to };

  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>Gestão do proprietário</span><h1>Relatórios</h1><p>Relatório reservado ao proprietário e usado também no envio diário ao e-mail principal da conta. Período atual: <strong>{reportPeriodLabel(period)}</strong>{selectedUser ? <> · Usuário: <strong>{selectedUser.name}</strong></> : null}.</p></div>
      <ReportActions print />
    </section>

    <form className={`${styles.filterPanel} ${styles.noPrint}`} method="get">
      <div className={styles.filterGrid}>
        <div className={styles.field}><label>Período</label><select name="preset" defaultValue={period.preset}><option value="month">Mês atual</option><option value="30d">Últimos 30 dias</option><option value="90d">Últimos 90 dias</option><option value="year">Ano atual</option><option value="custom">Personalizado</option></select></div>
        <div className={styles.field}><label>De</label><input name="from" type="date" defaultValue={period.from} /></div>
        <div className={styles.field}><label>Até</label><input name="to" type="date" defaultValue={period.to} /></div>
        <div className={styles.field}><label>Usuário</label><select name="userId" defaultValue={userId ?? ""}><option value="">Todos os usuários</option>{users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.label}</option>)}</select></div>
        <button className={styles.primaryButton} type="submit">Aplicar filtros</button>
      </div>
      <span className={styles.filterNote}>O filtro de usuário acompanha a responsabilidade ou autoria disponível em cada módulo. A atividade de equipe considera somente ações dentro do Jurisportal. Os relatórios não alteram registros do escritório.</span>
    </form>

    <nav className={`${styles.tabs} ${styles.noPrint}`} aria-label="Seções dos relatórios">
      <a href="#visao-geral">Visão geral</a><a href="#processos">Processos</a><a href="#prazos">Prazos e tarefas</a><a href="#publicacoes">Publicações</a><a href="#financeiro">Financeiro</a>{canTeam ? <a href="#equipe">Equipe</a> : null}{canAdvanced ? <a href="#avancado">Avançado</a> : null}
    </nav>

    <section id="visao-geral" className={styles.summaryGrid}>
      <article className={styles.summaryCard}><span>Clientes ativos</span><strong>{data.summary.totalClients}</strong><small>{data.summary.newClients} cadastrado(s) no período</small></article>
      <article className={styles.summaryCard}><span>Processos ativos</span><strong>{data.summary.activeProcesses}</strong><small>{data.summary.newProcesses} novo(s) no período · {data.summary.totalProcesses} no total</small></article>
      <article className={styles.summaryCard}><span>Prazos e tarefas abertos</span><strong>{data.summary.openWorkItems}</strong><small>{data.summary.overdueWorkItems} atrasado(s) agora · {data.summary.completedWorkItems} concluído(s) no período</small></article>
      <article className={styles.summaryCard}><span>Publicações no período</span><strong>{data.summary.capturedPublications}</strong><small>{data.summary.untreatedPublications} não tratada(s) · {data.summary.pendingDeadlineReviews} revisão(ões) de prazo pendente(s)</small></article>
      <article className={styles.summaryCard}><span>Honorários recebidos</span><strong className={styles.moneyPositive}>{brMoney(data.summary.receivedFees)}</strong><small>Recebimentos pagos no período</small></article>
      <article className={styles.summaryCard}><span>Custos pagos</span><strong className={styles.moneyNegative}>{brMoney(data.summary.paidCosts)}</strong><small>Custas e despesas pagas no período</small></article>
      <article className={styles.summaryCard}><span>Honorários pendentes</span><strong>{brMoney(data.summary.pendingFees)}</strong><small>Lançamentos pendentes com data no período</small></article>
      <article className={styles.summaryCard}><span>Itens com data no período</span><strong>{data.summary.dueWorkItems}</strong><small>Prazos e tarefas com vencimento dentro do filtro</small></article>
    </section>

    <section id="processos" className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Processos cadastrados no período</h2><p>Até 60 registros na tela. O CSV exporta até 5.000 registros do período.</p></div><ReportActions exportHref={exportHref("processes", periodParams, userId)} /></div>
      <div className={styles.tableWrap}>{data.processes.length === 0 ? <div className={styles.empty}>Nenhum processo foi cadastrado neste período.</div> : <table className={styles.table}><thead><tr><th>Referência</th><th>Cliente / assunto</th><th>CNJ</th><th>Responsável</th><th>Valor da causa</th><th>Status</th><th>Cadastro</th></tr></thead><tbody>{data.processes.map((item) => { const status = processStatusLabel(item.status); const primary = item.clients[0]?.client; return <tr key={item.id}><td><Link href={`/app/processos/${item.id}`}>{item.internalCode}</Link></td><td><strong>{primary?.tradeName || primary?.name || "Sem cliente principal"}</strong><small>{item.subject || item.court || "Sem assunto informado"}</small></td><td>{item.cnjFormatted}</td><td>{item.responsible?.name || "Sem responsável"}</td><td>{brMoney(item.caseValue)}</td><td><span className={badgeClass(status)}>{status}</span></td><td>{brDateTime(item.createdAt)}</td></tr>; })}</tbody></table>}</div>
    </section>

    <section id="prazos" className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Prazos e tarefas com data no período</h2><p>Mostra vencimentos dentro do filtro, mantendo o Processo como fonte única.</p></div><ReportActions exportHref={exportHref("work-items", periodParams, userId)} /></div>
      <div className={styles.tableWrap}>{data.workItems.length === 0 ? <div className={styles.empty}>Nenhum prazo ou tarefa com data neste período.</div> : <table className={styles.table}><thead><tr><th>Tipo</th><th>Item</th><th>Processo</th><th>Data</th><th>Responsável</th><th>Status</th></tr></thead><tbody>{data.workItems.map((item) => { const status = workStatusLabel(item.status); return <tr key={item.id}><td><span className={styles.badge}>{workKindLabel(item.kind)}{item.isFatal ? " · Fatal" : ""}</span></td><td><strong>{item.title}</strong><small>Prioridade {item.priority.toLowerCase()}</small></td><td><Link href={`/app/processos/${item.process.id}?tab=prazos`}>{item.process.internalCode}</Link><small>{item.process.cnjFormatted}</small></td><td>{brDate(item.dueDate)}{item.dueTime ? ` · ${item.dueTime}` : ""}</td><td>{item.responsible?.name || "Sem responsável"}</td><td><span className={badgeClass(status)}>{status}</span></td></tr>; })}</tbody></table>}</div>
    </section>

    <section id="publicacoes" className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Publicações e intimações</h2><p>Comunicações com data de publicação dentro do período selecionado.</p></div><ReportActions exportHref={exportHref("publications", periodParams, userId)} /></div>
      <div className={styles.tableWrap}>{data.publications.length === 0 ? <div className={styles.empty}>Nenhuma publicação ou intimação neste período.</div> : <table className={styles.table}><thead><tr><th>Data</th><th>Processo</th><th>Comunicação</th><th>Tribunal / órgão</th><th>Situação</th></tr></thead><tbody>{data.publications.map((item) => { const status = publicationStatusLabel(item); return <tr key={item.id}><td>{brDate(item.publicationDate)}</td><td>{item.process ? <Link href={`/app/processos/${item.process.id}?tab=publicacoes`}>{item.process.internalCode}</Link> : <strong>{item.processNumberFormatted || "Sem vínculo"}</strong>}<small>{item.processNumberFormatted || ""}</small></td><td><strong>{item.communicationType}</strong><small>{item.kind}</small></td><td>{item.court || "Não informado"}<small>{item.judicialBody || ""}</small></td><td><span className={badgeClass(status)}>{status}</span></td></tr>; })}</tbody></table>}</div>
    </section>

    <section id="financeiro" className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Financeiro jurídico</h2><p>Lançamentos relacionados aos processos com data dentro do período selecionado.</p></div><ReportActions exportHref={exportHref("finance", periodParams, userId)} /></div>
      <div className={styles.tableWrap}>{data.financeEntries.length === 0 ? <div className={styles.empty}>Nenhum lançamento financeiro neste período.</div> : <table className={styles.table}><thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Processo</th><th>Valor</th><th>Status</th></tr></thead><tbody>{data.financeEntries.map((item) => { const status = financeStatusLabel(item.status); return <tr key={item.id}><td>{brDate(item.entryDate)}</td><td>{financeKindLabel(item.kind)}</td><td><strong>{item.description}</strong><small>{item.paidBy ? `Pago por: ${item.paidBy}` : ""}{item.reimbursable ? " · Reembolsável" : ""}</small></td><td><Link href={`/app/processos/${item.process.id}?tab=financeiro`}>{item.process.internalCode}</Link><small>{item.process.cnjFormatted}</small></td><td><strong>{brMoney(item.amount)}</strong></td><td><span className={badgeClass(status)}>{status}</span></td></tr>; })}</tbody></table>}</div>
    </section>

    {canTeam && data.team ? <section id="equipe" className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Jornada e atividade da equipe</h2><p>Entrada, encerramento de sessão e ações registradas dentro do Jurisportal. O proprietário permanece fora dos indicadores de produtividade.</p></div><ReportActions exportHref={exportHref("team", periodParams, userId)} /></div>
      <div className={styles.advancedGrid} style={{ padding: 14 }}>{data.team.members.length === 0 ? <div className={styles.empty}>Nenhuma atividade auditável no período.</div> : data.team.members.map((member) => <article className={styles.miniPanel} key={member.userId}><h3>{member.name}</h3><div className={styles.metricRow}><span>Primeira entrada</span><strong>{member.firstEntry ? brDateTime(member.firstEntry) : "—"}</strong></div><div className={styles.metricRow}><span>Última saída</span><strong>{member.lastExit ? brDateTime(member.lastExit) : "—"}</strong></div><div className={styles.metricRow}><span>Última atividade</span><strong>{member.lastActivityAt ? brDateTime(member.lastActivityAt) : "—"}</strong></div><div className={styles.metricRow}><span>Ações registradas</span><strong>{member.actions}</strong></div></article>)}</div>
      <div className={styles.tableWrap}>{data.team.sessions.length === 0 ? <div className={styles.empty}>Nenhuma sessão de funcionário registrada neste período.</div> : <table className={styles.table}><thead><tr><th>Funcionário</th><th>Entrada</th><th>Saída</th><th>Última atividade</th><th>Duração</th><th>Encerramento</th></tr></thead><tbody>{data.team.sessions.map((session) => <tr key={`${session.userId}:${session.sessionId}`}><td><strong>{session.name}</strong><small>{session.email}</small></td><td>{brDateTime(session.startedAt)}</td><td>{session.endedAt ? brDateTime(session.endedAt) : "Não registrada"}</td><td>{session.lastActivityAt ? brDateTime(session.lastActivityAt) : "—"}</td><td>{durationLabel(session.durationMinutes)}</td><td>{session.endReasonLabel}</td></tr>)}</tbody></table>}</div>
      {data.team.recent.length ? <><div className={styles.panelHead}><div><h2>Atividade auditável recente</h2><p>Eventos funcionais realizados pelos usuários dentro do Jurisportal no período filtrado.</p></div></div><div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Data e hora</th><th>Usuário</th><th>Categoria</th><th>Ação</th></tr></thead><tbody>{data.team.recent.map((event) => <tr key={event.id}><td>{brDateTime(event.createdAt)}</td><td>{event.actor?.name || "Usuário removido"}<small>{event.actor?.email || ""}</small></td><td>{auditCategoryLabel(event.category)}</td><td>{auditActionLabel(event.action)}</td></tr>)}</tbody></table></div></> : null}
    </section> : null}

    {canAdvanced && data.advanced ? <section id="avancado" className={styles.panel}>
      <div className={styles.panelHead}><div><h2>Detalhamento avançado</h2><p>Disponível a partir do Premium. Distribui a operação por status, tipo e responsável sem criar métricas artificiais.</p></div></div>
      <div className={styles.advancedGrid} style={{ padding: 14 }}>
        <article className={styles.miniPanel}><h3>Processos novos por status</h3><div className={styles.metricList}>{data.advanced.processByStatus.length ? data.advanced.processByStatus.map((item) => <div className={styles.metricRow} key={item.status}><span>{processStatusLabel(item.status)}</span><strong>{item.count}</strong></div>) : <div className={styles.metricRow}><span>Sem dados</span><strong>0</strong></div>}</div></article>
        <article className={styles.miniPanel}><h3>Itens por tipo</h3><div className={styles.metricList}>{data.advanced.workByKind.length ? data.advanced.workByKind.map((item) => <div className={styles.metricRow} key={item.kind}><span>{workKindLabel(item.kind)}</span><strong>{item.count}</strong></div>) : <div className={styles.metricRow}><span>Sem dados</span><strong>0</strong></div>}</div></article>
        <article className={styles.miniPanel}><h3>Distribuição por responsável</h3><div className={styles.metricList}>{data.advanced.byResponsible.length ? data.advanced.byResponsible.slice(0, 10).map((item) => <div className={styles.metricRow} key={item.userId ?? "unassigned"}><span>{item.name}</span><strong>{item.processes} proc. · {item.workItems} itens</strong></div>) : <div className={styles.metricRow}><span>Sem dados</span><strong>0</strong></div>}</div></article>
      </div>
    </section> : <section className={styles.restricted}><h2>Relatórios avançados</h2><p>O plano {context.workspace.plan.name} possui os relatórios operacionais e financeiros básicos. Quebras por responsável e análises avançadas começam no Premium.</p></section>}

    <p className={styles.sectionNote}>Os dados exibidos respeitam a organização ativa. A exportação CSV é auditada e limitada a 5.000 linhas por relatório para proteger a aplicação de exportações excessivas.</p>
  </div>;
}

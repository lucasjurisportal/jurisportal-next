import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getWorkItemFormOptions, getWorkItemSummary, listGlobalWorkItems } from "@/modules/work-items/application/work-item-service";
import { GlobalWorkItemForm } from "@/components/work-items/GlobalWorkItemForm";
import { GlobalWorkItemActions } from "@/components/work-items/GlobalWorkItemActions";
import styles from "@/components/work-items/WorkManagement.module.css";

const views = [
  ["all", "Todos"], ["overdue", "Atrasados"], ["today", "Hoje"], ["upcoming", "Próximos"],
  ["fatal", "Fatais"], ["mine", "Minhas tarefas"], ["delegated", "Delegadas por mim"], ["completed", "Concluídas"],
] as const;

function dateLabel(value: Date | null, todayString: string) {
  if (!value) return { text: "Sem data", className: styles.muted };
  const dateString = value.toISOString().slice(0, 10);
  const formatted = value.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  if (dateString < todayString) return { text: formatted, className: styles.overdue };
  if (dateString === todayString) return { text: `Hoje · ${formatted}`, className: styles.today };
  return { text: formatted, className: styles.normalDate };
}

function queryHref(current: Record<string, string | undefined>, overrides: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...current, ...overrides })) if (value) params.set(key, value);
  return `/app/prazos${params.size ? `?${params}` : ""}`;
}

export default async function WorkItemsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const raw = await searchParams;
  const str = (key: string) => typeof raw[key] === "string" ? raw[key] as string : undefined;
  const view = str("view") || "all";
  const q = str("q") || "";
  const responsibleUserId = str("responsibleUserId") || "";
  const kindRaw = str("kind");
  const kind = kindRaw === "DEADLINE" || kindRaw === "TASK" ? kindRaw : undefined;
  const page = Math.max(1, Number(str("page") || "1") || 1);

  const [result, options, summary] = await Promise.all([
    listGlobalWorkItems({ organizationId: context.workspace.organizationId, currentUserId: context.user.id, view, query: q, responsibleUserId: responsibleUserId || undefined, kind, page }),
    getWorkItemFormOptions(context.workspace.organizationId),
    getWorkItemSummary(context.workspace.organizationId),
  ]);

  const current = { view, q: q || undefined, responsibleUserId: responsibleUserId || undefined, kind: kind || undefined };

  return <div className={styles.page}>
    <section className={styles.heading}><div><span className={styles.eyebrow}>Operação</span><h1>Prazos e tarefas</h1><p>Uma única fonte de verdade. Itens criados aqui aparecem no processo e, quando possuem data, também na Agenda.</p></div><GlobalWorkItemForm processes={options.processes} members={options.members} /></section>

    <section className={styles.summary}><article><span>Pendentes</span><strong>{summary.open}</strong></article><article><span>Atrasados</span><strong>{summary.overdue}</strong></article><article><span>Hoje</span><strong>{summary.today}</strong></article><article><span>Prazos fatais</span><strong>{summary.fatal}</strong></article></section>

    <nav className={styles.tabs}>{views.map(([key, label]) => <Link key={key} className={view === key ? styles.active : ""} href={queryHref(current, { view: key, page: undefined })}>{label}</Link>)}</nav>

    <form className={styles.toolbar} method="get">
      <input type="hidden" name="view" value={view} />
      <input name="q" defaultValue={q} placeholder="Título, processo, cliente..." />
      <select name="responsibleUserId" defaultValue={responsibleUserId}><option value="">Todos os responsáveis</option>{options.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select>
      <select name="kind" defaultValue={kind ?? ""}><option value="">Prazo e tarefa</option><option value="DEADLINE">Prazo</option><option value="TASK">Tarefa</option></select>
      <button className={styles.secondaryButton}>Filtrar</button>
    </form>

    <section className={styles.tablePanel}>
      {result.items.length === 0 ? <div className={styles.empty}>Nenhum item encontrado neste filtro.</div> : <table className={styles.table}><thead><tr><th>Item</th><th>Processo / cliente</th><th>Data</th><th>Responsável</th><th>Status</th><th>Ações</th></tr></thead><tbody>{result.items.map((item) => {
        const primary = item.process.clients[0]?.client;
        const due = dateLabel(item.dueDate, result.todayString);
        return <tr key={item.id}>
          <td><div className={styles.itemTitle}><span className={item.kind === "DEADLINE" ? styles.badgeDeadline : styles.badgeTask}>{item.kind === "DEADLINE" ? "Prazo" : "Tarefa"}</span><strong>{item.title}</strong><small>{item.priority === "HIGH" ? "Prioridade alta" : item.priority === "LOW" ? "Prioridade baixa" : "Prioridade normal"}{item.isFatal ? " · Fatal" : ""}{item.origin !== "MANUAL" ? ` · ${item.origin}` : ""}</small></div></td>
          <td><div className={styles.itemTitle}><Link className={styles.processLink} href={`/app/processos/${item.process.id}?tab=prazos`}>{item.process.cnjFormatted}</Link><small>{primary?.tradeName || primary?.name || item.process.subject || "Sem cliente principal"}</small></div></td>
          <td><span className={due.className}>{due.text}{item.dueTime ? ` · ${item.dueTime}` : ""}</span></td>
          <td>{item.responsible?.name || "Sem responsável"}</td>
          <td>{item.status === "DONE" ? <span className={styles.badgeDone}>Concluído</span> : "Pendente"}</td>
          <td><GlobalWorkItemActions item={{ id: item.id, kind: item.kind, status: item.status, title: item.title, dueDate: item.dueDate?.toISOString().slice(0, 10) ?? null, dueTime: item.dueTime, responsibleUserId: item.responsibleUserId, priority: item.priority, notes: item.notes }} members={options.members} /></td>
        </tr>;
      })}</tbody></table>}
      <div className={styles.pagination}><span>Página {result.page} de {result.totalPages} · {result.total} item(ns)</span><span>{result.page > 1 ? <Link href={queryHref(current, { page: String(result.page - 1) })}>← Anterior</Link> : null} {result.page < result.totalPages ? <Link href={queryHref(current, { page: String(result.page + 1) })}>Próxima →</Link> : null}</span></div>
    </section>
  </div>;
}

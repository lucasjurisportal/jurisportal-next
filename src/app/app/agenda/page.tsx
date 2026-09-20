import Link from "next/link";
import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getAgendaOptions, listAgenda } from "@/modules/agenda/application/agenda-service";
import { AgendaEventForm } from "@/components/agenda/AgendaEventForm";
import { GoogleCalendarIntegration } from "@/components/agenda/GoogleCalendarIntegration";
import { getGoogleCalendarConnectionStatus } from "@/modules/integrations/google-calendar/application/google-calendar-connection-service";
import styles from "@/components/agenda/Agenda.module.css";

function typeLabel(type: string) {
  if (type === "DEADLINE") return "Prazo";
  if (type === "TASK") return "Tarefa";
  if (type === "HEARING") return "Audiência";
  if (type === "COMMITMENT") return "Compromisso";
  return type;
}

function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function dateLabel(date: Date) {
  const text = date.toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function href(view: string, date: string, responsibleUserId?: string) {
  const params = new URLSearchParams({ view, date });
  if (responsibleUserId) params.set("responsibleUserId", responsibleUserId);
  return `/app/agenda?${params}`;
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const raw = await searchParams;
  const value = (key: string) => typeof raw[key] === "string" ? raw[key] as string : undefined;
  const viewRaw = value("view") || "today";
  const view = viewRaw === "week" || viewRaw === "month" ? viewRaw : "today";
  const date = value("date");
  const responsibleUserId = value("responsibleUserId") || "";
  const [agenda, options, googleCalendar] = await Promise.all([
    listAgenda({ organizationId: context.workspace.organizationId, view, anchor: date, responsibleUserId: responsibleUserId || undefined }),
    getAgendaOptions(context.workspace.organizationId),
    getGoogleCalendarConnectionStatus(context.workspace.organizationId, context.user.id),
  ]);

  const anchor = agenda.range.anchorString;
  const groups = new Map<string, typeof agenda.items>();
  for (const item of agenda.items) {
    const key = dateKey(item.date);
    const current = groups.get(key) ?? [];
    current.push(item);
    groups.set(key, current);
  }

  return <div className={styles.page}>
    <section className={styles.heading}>
      <div><span className={styles.eyebrow}>Agenda</span><h1>Agenda do escritório</h1><p>Prazos e tarefas datados entram aqui automaticamente. Audiências e compromissos podem ser adicionados separadamente.</p></div>
      <AgendaEventForm processes={options.processes} members={options.members} defaultDate={anchor} />
    </section>

    <GoogleCalendarIntegration connected={googleCalendar.connected} connectedAt={googleCalendar.connection?.connectedAt?.toISOString() ?? null} lastUsedAt={googleCalendar.connection?.lastUsedAt?.toISOString() ?? null} errorCount={googleCalendar.errorCount} oauthMessage={value("google")} />

    <div className={styles.controls}>
      <Link className={view === "today" ? styles.active : ""} href={href("today", anchor, responsibleUserId)}>Hoje</Link>
      <Link className={view === "week" ? styles.active : ""} href={href("week", anchor, responsibleUserId)}>Semana</Link>
      <Link className={view === "month" ? styles.active : ""} href={href("month", anchor, responsibleUserId)}>Mês</Link>
      <Link href={`/app/prazos?view=today`}>Abrir Prazos e tarefas</Link>
    </div>

    <form className={styles.filterBar} method="get">
      <input type="hidden" name="view" value={view} />
      <label>Data <input name="date" type="date" defaultValue={anchor} /></label>
      <select name="responsibleUserId" defaultValue={responsibleUserId}><option value="">Todos os responsáveis</option>{options.members.map((member) => <option key={member.user.id} value={member.user.id}>{member.user.name}</option>)}</select>
      <button className={styles.secondaryButton}>Aplicar</button>
      <span className={styles.legend}>Tarefas sem data permanecem em Prazos e tarefas e não entram na Agenda.</span>
    </form>

    {groups.size === 0 ? <div className={styles.empty}>Nenhum item neste período.</div> : Array.from(groups.entries()).map(([key, items]) => {
      const dateObject = new Date(`${key}T00:00:00.000Z`);
      return <section className={styles.dayGroup} key={key}>
        <div className={styles.dayHeader}><strong>{dateLabel(dateObject)}</strong><span>{items.length} item(ns)</span></div>
        <div className={styles.items}>{items.map((item) => <article className={styles.item} key={item.id}>
          <div className={styles.time}>{item.time || "Sem horário"}</div>
          <div className={styles.itemMain}>
            <span className={`${styles.kind} ${item.isFatal ? styles.fatal : ""}`}>{typeLabel(item.type)}{item.isFatal ? " · Fatal" : ""}</span>
            <strong>{item.title}</strong>
            {item.process ? <Link className={styles.processLink} href={`/app/processos/${item.process.id}${item.source === "WORK_ITEM" ? "?tab=prazos" : ""}`}>{item.process.cnjFormatted}</Link> : <small>Sem processo vinculado</small>}
            {item.notes ? <small>{item.notes}</small> : null}
          </div>
          <div className={styles.responsible}>{item.responsible?.name || "Sem responsável"}</div>
        </article>)}</div>
      </section>;
    })}
  </div>;
}

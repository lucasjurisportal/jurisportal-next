import Link from "next/link";
import type { DashboardData } from "@/modules/dashboard/application/dashboard-service";
import styles from "./Dashboard.module.css";

type Props = {
  data: DashboardData;
  userName: string;
  role: string;
  processLimit: number | "unlimited";
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()));
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "J";
}

function syncLabel(value: string | null) {
  if (!value) return "Aguardando primeira consulta";
  return `última atualização ${new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" })}`;
}

export function Dashboard({ data, userName, role, processLimit }: Props) {
  const monitored = data.processStats.total;
  const progress = processLimit === "unlimited" ? 0 : Math.min(100, (monitored / Math.max(1, processLimit)) * 100);

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Visão do dia</span>
          <h1>{greeting()}, {firstName(userName)}.</h1>
          <p>Comece pelo que pede atenção e acompanhe o restante do escritório pelos atalhos abaixo.</p>
        </div>
        <div className={styles.syncStatus}>
          <span className={styles.syncDot} />
          <div><strong>DJeN</strong><span>{syncLabel(data.latestDjenAt)}</span></div>
        </div>
      </section>

      <section className={styles.metricsGrid} aria-label="Indicadores do dia">
        {data.metrics.map((item) => (
          <Link key={item.label} href={item.href} className={`${styles.metric} ${styles[item.tone]}`}>
            <span>{item.label}</span><strong>{item.value}</strong><small>{item.helper}</small><i>→</i>
          </Link>
        ))}
      </section>

      <section className={styles.mainGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.eyebrow}>Prioridade</span><h2>Precisa da sua atenção</h2></div>
            <Link href="/app/prazos">Ver tudo</Link>
          </div>
          <div className={styles.attentionList}>
            {data.attention.length === 0 ? <div className={styles.emptyState}>Nenhuma pendência urgente encontrada agora.</div> : data.attention.map((item) => (
              <div className={styles.attentionRow} key={item.id}>
                <span className={`${styles.tag} ${styles[item.tone]}`}>{item.level}</span>
                <div className={styles.attentionText}><strong>{item.title}</strong><span>{item.meta}</span></div>
                <Link className={styles.rowAction} href={item.href}>{item.action}</Link>
              </div>
            ))}
          </div>
        </article>

        <aside className={styles.sideStack}>
          <article className={styles.panel}>
            <div className={styles.panelHeadCompact}>
              <div><span className={styles.eyebrow}>Processos</span><h2>Carteira atual</h2></div>
              <Link href="/app/processos">Abrir</Link>
            </div>
            <div className={styles.processStats}>
              <div><strong>{data.processStats.active}</strong><span>ativos</span></div>
              <div><strong>{data.processStats.movedLast30Days}</strong><span>atualizados em 30 dias</span></div>
              <div><strong>{data.processStats.withoutRecentMovement}</strong><span>sem atualização há 30 dias</span></div>
            </div>
            <div className={styles.monitorBox}>
              <div><span>Processos no plano</span><strong>{monitored} / {processLimit === "unlimited" ? "∞" : processLimit}</strong></div>
              <div className={styles.monitorTrack}><i style={{ width: `${progress}%` }} /></div>
            </div>
          </article>

          {role === "owner" ? <article className={styles.panel}>
            <div className={styles.panelHeadCompact}>
              <div><span className={styles.eyebrow}>Equipe</span><h2>Atividade recente</h2></div>
              <Link href="/app/equipe">Detalhes</Link>
            </div>
            <div className={styles.teamRows}>
              {data.team.length === 0 ? <div className={styles.emptySmall}>Nenhum auxiliar ativo.</div> : data.team.map((person) => <div key={person.id}><span className={styles.personDot}>{initials(person.name)}</span><p><strong>{person.name}</strong><small>{person.detail}</small></p></div>)}
            </div>
          </article> : <article className={styles.panel}>
            <div className={styles.panelHeadCompact}><div><span className={styles.eyebrow}>Seu trabalho</span><h2>Atalhos</h2></div></div>
            <div className={styles.personalLinks}><Link href="/app/prazos?view=mine">Minhas tarefas</Link><Link href="/app/agenda?view=week">Minha agenda</Link><Link href="/app/publicacoes?view=untreated">Publicações pendentes</Link></div>
          </article>}
        </aside>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><span className={styles.eyebrow}>Atividade recente</span><h2>{role === "owner" ? "O que mudou no escritório" : "Suas últimas ações"}</h2></div></div>
          <div className={styles.activityTable}>
            {data.activity.length === 0 ? <div className={styles.emptyState}>As atividades registradas aparecerão aqui.</div> : data.activity.map((item) => <div className={styles.activityRow} key={item.id}><time>{item.time}</time><span className={styles.activityMarker} /><div>{item.href ? <Link href={item.href}><strong>{item.title}</strong></Link> : <strong>{item.title}</strong>}<span>{item.meta}</span></div><small>{item.actor}</small></div>)}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeadCompact}><div><span className={styles.eyebrow}>Próximos compromissos</span><h2>Agenda</h2></div><Link href="/app/agenda?view=week">Ver agenda</Link></div>
          <div className={styles.agendaList}>
            {data.agenda.length === 0 ? <div className={styles.emptySmall}>Nenhum compromisso nos próximos 7 dias.</div> : data.agenda.map((item) => <Link className={styles.agendaLink} href={item.href} key={item.id}><time><b>{item.day}</b><span>{item.month}</span></time><p><strong>{item.title}</strong><span>{item.meta}</span></p></Link>)}
          </div>
        </article>
      </section>

      <section className={styles.quickActions}>
        <span>Ações rápidas</span>
        <Link href="/app/processos/novo">+ Novo processo</Link>
        <Link href="/app/prazos">+ Novo prazo</Link>
        <Link href="/app/prazos">+ Nova tarefa</Link>
        <Link href="/app/agenda">+ Novo compromisso</Link>
      </section>
    </div>
  );
}

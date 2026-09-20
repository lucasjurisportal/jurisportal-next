"use client";

import { useEffect, useState } from "react";
import styles from "./PublicSite.module.css";

type DemoSlide = {
  title: string;
  description: string;
  metrics: { value: string; label: string }[];
  rows: { label: string; value: string }[];
};

const slides: DemoSlide[] = [
  {
    title: "Visão geral",
    description: "A entrada do sistema mostra o que exige ação primeiro, sem transformar o dashboard em um inventário de informações.",
    metrics: [
      { value: "8", label: "publicações novas" },
      { value: "5", label: "prazos hoje" },
      { value: "2", label: "prazos atrasados" },
    ],
    rows: [
      { label: "Audiências nos próximos 7 dias", value: "4" },
      { label: "Tarefas pendentes", value: "9" },
    ],
  },
  {
    title: "Processos",
    description: "Busca única, filtros claros e acesso rápido ao processo sem navegar por várias telas diferentes.",
    metrics: [
      { value: "339", label: "ativos" },
      { value: "52", label: "movimentados em 30 dias" },
      { value: "283", label: "sem movimentação" },
    ],
    rows: [
      { label: "1001234-56.2026.8.26.0100", value: "Ativo" },
      { label: "1002101-22.2026.5.02.0609", value: "Ativo" },
    ],
  },
  {
    title: "Publicações e intimações",
    description: "O DJeN alimenta a caixa de entrada jurídica e cada item pode ser vinculado ao processo, tratado e transformado em prazo ou tarefa.",
    metrics: [
      { value: "8", label: "novas" },
      { value: "3", label: "intimações" },
      { value: "6", label: "tratadas hoje" },
    ],
    rows: [
      { label: "Reclamação Trabalhista", value: "Nova" },
      { label: "Consulta programada", value: "18:00" },
    ],
  },
  {
    title: "Prazos e tarefas",
    description: "Prazos, tarefas e responsáveis ficam no mesmo fluxo e podem nascer diretamente de uma publicação ou de um processo.",
    metrics: [
      { value: "3", label: "fatais" },
      { value: "2", label: "atrasados" },
      { value: "9", label: "tarefas pendentes" },
    ],
    rows: [
      { label: "Contrarrazões · processo 20000262.4", value: "Hoje" },
      { label: "Revisar documento", value: "Amanhã" },
    ],
  },
];

export function DemonstrationSection() {
  const [active, setActive] = useState(0);
  const slide = slides[active];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, []);

  function move(direction: number) {
    setActive((current) => (current + direction + slides.length) % slides.length);
  }

  return (
    <section id="demonstracao" className={styles.demoSection}>
      <div className="container">
        <span className="eyebrow">Por dentro do Jurisportal</span>
        <h2 className="section-title">Veja o sistema antes de entrar nele.</h2>
        <p className="section-lead">
          A demonstração destaca o fluxo real do Jurisportal Next. Ao lado, um recorte do dashboard mostra como o escritório será apresentado sem expor dados identificáveis.
        </p>

        <div className={styles.demoStage}>
          <div className={styles.demoShell}>
            <div className={styles.demoHeader}>
              <strong>{active + 1} de {slides.length} · {slide.title}</strong>
              <div className={styles.demoArrows}>
                <button type="button" onClick={() => move(-1)} aria-label="Demonstração anterior">‹</button>
                <button type="button" onClick={() => move(1)} aria-label="Próxima demonstração">›</button>
              </div>
            </div>

            <div className={styles.demoContent}>
              <div className={styles.demoCopy}>
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
              </div>

              <div className={styles.demoScreen}>
                <div className={styles.demoScreenTitle}>{slide.title}</div>
                <div className={styles.demoMetrics}>
                  {slide.metrics.map((metric) => (
                    <article key={metric.label}>
                      <strong>{metric.value}</strong>
                      <span>{metric.label}</span>
                    </article>
                  ))}
                </div>

                <div className={styles.demoRows}>
                  {slide.rows.map((row) => (
                    <div key={row.label}>
                      <span>{row.label}</span>
                      <b>{row.value}</b>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.demoDots} aria-label="Escolher demonstração">
              {slides.map((item, index) => (
                <button
                  key={item.title}
                  type="button"
                  className={index === active ? styles.activeDot : ""}
                  onClick={() => setActive(index)}
                  aria-label={`Ver ${item.title}`}
                  aria-current={index === active ? "true" : undefined}
                />
              ))}
            </div>
          </div>

          <aside className={styles.floatingDashboard} aria-label="Prévia do dashboard do Jurisportal Next">
            <div className={styles.floatingBrowserBar}><i/><i/><i/><span>app.jurisportal.com.br</span></div>
            <div className={styles.floatingDashboardTop}>
              <div>
                <span>Seu escritório</span>
                <strong className={styles.maskedOffice}>Escritório •••••••••••</strong>
              </div>
              <b>DJeN atualizado</b>
            </div>
            <div className={styles.floatingMetrics}>
              <article><strong>8</strong><span>publicações novas</span></article>
              <article><strong>5</strong><span>prazos hoje</span></article>
              <article className={styles.dangerMetric}><strong>2</strong><span>atrasados</span></article>
            </div>
            <div className={styles.floatingAttention}>
              <span>Precisa da sua atenção</span>
              <div><b>Prazo fatal vence hoje</b><small>Processo •••••••••••0100</small></div>
              <div><b>Publicação ainda não tratada</b><small>Recebida às 12:04</small></div>
              <div><b>Audiência amanhã às 10:00</b><small>Processo •••••••••••0609</small></div>
            </div>
            <div className={styles.floatingFooter}>
              <span>339 processos ativos</span>
              <span>187 / 250 monitorados</span>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

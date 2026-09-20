import styles from "./PublicSite.module.css";

const pains = [
  ["Publicações espalhadas", "Pare de depender de conferência manual em vários lugares para descobrir o que chegou."],
  ["Prazos na cabeça", "Veja o que vence hoje, o que está próximo e o que ficou pendente sem caçar informação."],
  ["Processos fragmentados", "Centralize histórico, partes, movimentações e informações importantes do caso."],
  ["Rotina sem visão", "Abra o sistema e entenda rapidamente onde o escritório precisa da sua atenção."],
];

export function ProblemSection() {
  return (
    <section className="section" id="recursos">
      <div className="container">
        <span className="eyebrow">O problema é operacional</span>
        <h2 className="section-title">Seu dia não deveria começar procurando o que aconteceu.</h2>
        <p className="section-lead">
          Informação jurídica perdida entre abas, planilhas e pessoas custa tempo. O Jurisportal organiza o essencial para você decidir e agir mais rápido.
        </p>
        <div className={styles.problemGrid}>
          {pains.map(([title, text], index) => (
            <article className={styles.problemCard} key={title}>
              <span className={styles.problemNumber}>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

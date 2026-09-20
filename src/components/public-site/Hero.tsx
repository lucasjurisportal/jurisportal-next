import Link from "next/link";
import styles from "./PublicSite.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroCopy}>
          <span className="eyebrow">Menos burocracia. Mais advocacia.</span>
          <h1>Controle, organize e administre seu escritório com um click.</h1>
          <p>
            Processos, publicações, intimações, prazos e a rotina do escritório organizados
            em um só lugar. Você abre o Jurisportal e entende o dia antes que o dia vire problema.
          </p>
          <div className={styles.heroActions}>
            <Link className="primary-button" href="#planos">Conhecer os planos</Link>
            <Link className="secondary-button" href="/login">Já sou cliente</Link>
          </div>
          <div className={styles.heroTrust}>
            <span>✓ Publicações e intimações em todos os planos pagos</span>
            <span>✓ Acesso de qualquer dispositivo</span>
            <span>✓ Rotina jurídica em um único ambiente</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="Exemplo visual do Jurisportal">
          <div className={styles.browserTop}><i/><i/><i/></div>
          <div className={styles.dashboardMock}>
            <div className={styles.mockHello}>Bom dia. Seu escritório hoje:</div>
            <div className={styles.mockNumbers}>
              <article><strong>3</strong><span>publicações novas</span></article>
              <article><strong>2</strong><span>prazos para hoje</span></article>
              <article><strong>1</strong><span>audiência amanhã</span></article>
            </div>
            <div className={styles.mockList}>
              <div><span>Publicação recebida</span><b>há 12 min</b></div>
              <div><span>Prazo processual</span><b>vence hoje</b></div>
              <div><span>Honorário pendente</span><b>R$ 1.850</b></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

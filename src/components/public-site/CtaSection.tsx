import Link from "next/link";
import styles from "./PublicSite.module.css";

export function CtaSection() {
  return (
    <section className={styles.ctaSection}>
      <div className={`container ${styles.ctaInner}`}>
        <div>
          <span>Menos burocracia. Mais advocacia.</span>
          <h2>Seu escritório já tem trabalho suficiente. O sistema não precisa ser mais um.</h2>
        </div>
        <Link className={styles.ctaButton} href="#planos">Escolher meu plano</Link>
      </div>
    </section>
  );
}

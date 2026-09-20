import Image from "next/image";
import styles from "./PublicSite.module.css";

export function HumanSection() {
  return (
    <section className={styles.humanSection}>
      <div className={`container ${styles.humanGrid}`}>
        <figure className={styles.humanPhoto}>
          <Image
            src="/brand/advogados-cafe.png"
            alt="Profissionais em um escritório conversando e tomando café durante uma pausa"
            width={1536}
            height={1024}
            className={styles.humanPhotoImage}
          />
          <figcaption>Uma rotina mais leve também faz parte do trabalho.</figcaption>
        </figure>
        <div>
          <span className="eyebrow eyebrow-light">Tecnologia que devolve tempo</span>
          <h2 className="section-title">O sistema deve trabalhar para o advogado, não o contrário.</h2>
          <p className="section-lead">
            O Jurisportal foi pensado para tirar pequenas conferências da frente do trabalho jurídico. Menos tempo procurando, cobrando e lembrando. Mais tempo para estratégia, cliente e advocacia.
          </p>
          <div className={styles.shortBenefits}>
            <div><strong>Veja</strong><span>o que realmente precisa de atenção.</span></div>
            <div><strong>Organize</strong><span>processos, prazos e clientes sem espalhar a rotina.</span></div>
            <div><strong>Respire</strong><span>com mais previsibilidade sobre o que acontece no escritório.</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

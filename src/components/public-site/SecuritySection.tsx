import Link from "next/link";
import styles from "./PublicSite.module.css";

export function SecuritySection() {
  return (
    <section className="section" id="seguranca">
      <div className={`container ${styles.securityGrid}`}>
        <div>
          <span className="eyebrow">Segurança e LGPD</span>
          <h2 className="section-title">Seu escritório lida com informação que precisa ser tratada com responsabilidade.</h2>
          <p className="section-lead">
            O Jurisportal Next nasce com separação dos dados por escritório, controle de acesso e boas práticas de proteção desde a arquitetura. Segurança não aparece só no discurso, ela precisa existir no desenho do sistema.
          </p>
          <Link className={styles.textLink} href="/privacidade">Ver como tratamos privacidade e LGPD →</Link>
        </div>
        <div className={styles.securityCards}>
          <article><strong>Dados separados</strong><span>Cada escritório opera em seu próprio ambiente lógico.</span></article>
          <article><strong>Acesso controlado</strong><span>Usuários e permissões serão definidos conforme a estrutura da equipe.</span></article>
          <article><strong>Menos exposição</strong><span>Coletamos e armazenamos apenas o necessário para a operação.</span></article>
          <article><strong>Rastreabilidade</strong><span>Ações relevantes poderão ser registradas para auditoria e segurança.</span></article>
        </div>
      </div>
    </section>
  );
}

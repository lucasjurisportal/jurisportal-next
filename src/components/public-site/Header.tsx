import Link from "next/link";
import { Brand } from "./Brand";
import styles from "./PublicSite.module.css";

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" aria-label="Ir para a página inicial">
          <Brand />
        </Link>
        <nav className={styles.nav} aria-label="Navegação principal">
          <Link href="/#recursos">Recursos</Link>
          <Link href="/#seguranca">Segurança</Link>
          <Link href="/#planos">Planos</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/sobre">Sobre nós</Link>
          <Link href="/contato">Contato</Link>
        </nav>
        <div className={styles.headerActions}>
          <Link className={styles.loginLink} href="/login">Entrar</Link>
          <Link className="primary-button" href="/cadastro">Criar conta</Link>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { Brand } from "./Brand";
import styles from "./PublicSite.module.css";

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.header}>
      <div className={`container ${styles.headerInner}`}>
        <Link href="/" aria-label="Ir para a página inicial">
          <Brand />
        </Link>
        <nav id="jp-public-nav" className={`${styles.nav} ${open ? styles.publicNavOpen : ""}`} aria-label="Navegação principal" onClick={() => setOpen(false)}>
          <Link href="/#recursos">Recursos</Link>
          <Link href="/#seguranca">Segurança</Link>
          <Link href="/#planos">Planos</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/sobre">Sobre nós</Link>
          <Link href="/contato">Contato</Link>
        </nav>
        <div className={styles.headerActions}>
          <button type="button" className={styles.publicMenuToggle} aria-controls="jp-public-nav" aria-expanded={open}
            onClick={() => setOpen((value) => !value)}>{open ? "Fechar" : "☰ Menu"}</button>
          <Link className={styles.loginLink} href="/login">Entrar</Link>
          <Link className="primary-button" href="/cadastro">Criar conta</Link>
        </div>
      </div>
    </header>
  );
}

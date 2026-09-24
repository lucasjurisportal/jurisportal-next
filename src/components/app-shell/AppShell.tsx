"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TopbarUserControls } from "./TopbarUserControls";
import { ActivityGuard } from "@/components/team/ActivityGuard";
import { ModuleGuide } from "@/components/help/ModuleGuide";
import styles from "./AppShell.module.css";

type Props = {
  children: React.ReactNode;
  organizationName: string;
  userName: string;
  userEmail: string;
  userImage: string | null;
  role: string;
  userOab: string | null;
  jobTitle: string | null;
  accessLevel: string | null;
  sessionStartedAt: string | null;
  planName: string;
  processCount: number;
  processLimit: number | "unlimited";
  subscriptionStatus: string;
};

const menu = [
  ["Dashboard", "/app/dashboard", "⌂"],
  ["Processos", "/app/processos", "▣"],
  ["Publicações e intimações", "/app/publicacoes", "✉"],
  ["Prazos e tarefas", "/app/prazos", "✓"],
  ["Agenda", "/app/agenda", "□"],
  ["Clientes", "/app/clientes", "♙"],
  ["Equipe", "/app/equipe", "♚"],
  ["Modelos de petições", "/app/modelos", "▤"],
  ["Relatórios", "/app/relatorios", "≡"],
] as const;

function statusLabel(status: string) {
  if (status === "trialing") return "Período gratuito";
  if (status === "active") return "Ativo";
  if (status === "pending_payment") return "Pagamento pendente";
  if (status === "pending_verification") return "E-mail pendente";
  if (status === "internal") return "Ambiente interno";
  return "Em configuração";
}

export function AppShell({
  children,
  organizationName,
  userName,
  userEmail,
  userImage,
  role,
  userOab,
  jobTitle,
  accessLevel,
  sessionStartedAt,
  planName,
  processCount,
  processLimit,
  subscriptionStatus,
}: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => setMobileMenuOpen(false), [pathname]);

  useEffect(() => {
    const scale = window.localStorage.getItem("jp-font-scale") || "1";
    const numeric = Number(scale);
    document.documentElement.style.fontSize = `${Number.isFinite(numeric) ? numeric * 100 : 100}%`;
  }, []);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className={styles.shell}>
      <ActivityGuard role={role} />
      <ModuleGuide />
      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <div className={styles.logoWrap}>
          <Image
            className={styles.logo}
            src="/brand/jurisportal-logo-next.png"
            alt="Jurisportal"
            width={410}
            height={191}
            priority
          />
        </div>

        <button className={styles.mobileMenuToggle} type="button" aria-expanded={mobileMenuOpen}
          aria-controls="jp-main-menu" onClick={() => setMobileMenuOpen((open) => !open)}>
          {mobileMenuOpen ? "Fechar menu" : "☰ Menu"}
        </button>
        <nav id="jp-main-menu" className={`${styles.nav} ${mobileMenuOpen ? styles.navOpen : ""}`} aria-label="Navegação principal">
          <p className={styles.navLabel}>Escritório</p>
          {menu.filter(([label]) => label !== "Relatórios" || role === "owner").map(([label, href, icon]) => (
            <Link
              key={href}
              href={href}
              className={`${styles.navItem} ${isActive(href) ? styles.active : ""}`}
            >
              <span className={styles.navIcon}>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}

          <p className={styles.navLabel}>Administração</p>
          <Link href="/app/configuracoes" className={`${styles.navItem} ${isActive("/app/configuracoes") ? styles.active : ""}`}>
            <span className={styles.navIcon}>⚙</span>
            <span>Configurações</span>
          </Link>
          <Link href="/app/ajuda" className={`${styles.navItem} ${isActive("/app/ajuda") ? styles.active : ""}`}>
            <span className={styles.navIcon}>?</span>
            <span>Ajuda</span>
          </Link>
          {role === "owner" && <Link href="/app/plano" className={`${styles.navItem} ${isActive("/app/plano") ? styles.active : ""}`}>
            <span className={styles.navIcon}>◇</span>
            <span>Plano e cobrança</span>
          </Link>}
        </nav>

        <div className={styles.licenseBox}>
          <span className={styles.licenseTitle}>Plano {planName}</span>
          <strong>{processCount} / {processLimit === "unlimited" ? "∞" : processLimit}</strong>
          <span>processos cadastrados</span>
          <small>{statusLabel(subscriptionStatus)}</small>
          <div className={styles.progress}><i style={{ width: processLimit === "unlimited" ? "0%" : `${Math.min(100, (processCount / Math.max(1, processLimit)) * 100)}%` }} /></div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.office}>
            <strong>{organizationName}</strong>
            <span>Jurisportal Next</span>
          </div>

          <label className={styles.globalSearch}>
            <span>⌕</span>
            <input placeholder="Buscar processo, cliente ou parte..." />
          </label>

          <TopbarUserControls
            userName={userName}
            userEmail={userEmail}
            userImage={userImage}
            role={role}
            organizationName={organizationName}
            userOab={userOab}
            jobTitle={jobTitle}
            accessLevel={accessLevel}
            sessionStartedAt={sessionStartedAt}
          />
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

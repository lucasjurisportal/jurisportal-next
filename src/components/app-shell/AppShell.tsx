"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TopbarUserControls } from "./TopbarUserControls";
import { ActivityGuard } from "@/components/team/ActivityGuard";
import { ModuleGuide } from "@/components/help/ModuleGuide";
import { DEFAULT_APP_THEME, THEME_EVENT, themeStorageKey, validAppTheme, type AppTheme } from "@/modules/appearance/domain/theme";
import type { AiCreditBalance } from "@/modules/ai/domain/ai-credit-policy";
import styles from "./AppShell.module.css";

type Props = {
  children: React.ReactNode;
  organizationName: string;
  userId: string;
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
  aiCreditBalance: AiCreditBalance;
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


function CoinIcon() {
  return <svg className={styles.creditCoinIcon} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8.7 9.2c.6-1 1.8-1.6 3.3-1.6 1.9 0 3.3.9 3.3 2.2 0 3-6.5 1.1-6.5 4.3 0 1.3 1.4 2.3 3.4 2.3 1.5 0 2.7-.5 3.5-1.5M12 5.8v12.4" />
  </svg>;
}

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
  userId,
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
  aiCreditBalance,
}: Props) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appTheme, setAppTheme] = useState<AppTheme>(DEFAULT_APP_THEME);

  useEffect(() => {
    const read = () => {
      try { setAppTheme(validAppTheme(window.localStorage.getItem(themeStorageKey(userId)))); }
      catch { setAppTheme(DEFAULT_APP_THEME); }
    };
    read();
    window.addEventListener(THEME_EVENT, read);
    // A preferência é por usuário e por navegador. Não transmite cores de um escritório a outro.
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(THEME_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, [userId]);

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
    <div className={styles.shell} data-jp-theme={appTheme}>
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

          <div className={styles.topbarActions}>
            {role === "owner" ? <Link
              className={styles.creditPill}
              href="/app/plano#creditos-ia"
              title={`Créditos de IA: ${aiCreditBalance.available} disponíveis de ${aiCreditBalance.monthlyLimit} neste mês`}
              aria-label={`Créditos de IA: ${aiCreditBalance.available} disponíveis de ${aiCreditBalance.monthlyLimit}`}
            ><><span className={styles.creditCoin}><CoinIcon /></span><span className={styles.creditCopy}><small>Créditos IA</small><strong>{aiCreditBalance.available.toLocaleString("pt-BR")}</strong></span>{aiCreditBalance.monthlyLimit > 0 ? <span className={styles.creditLimit}>/{aiCreditBalance.monthlyLimit.toLocaleString("pt-BR")}</span> : null}</></Link> : <div
              className={styles.creditPill}
              title={`Créditos de IA do escritório: ${aiCreditBalance.available} disponíveis de ${aiCreditBalance.monthlyLimit} neste mês`}
              aria-label={`Créditos de IA: ${aiCreditBalance.available} disponíveis de ${aiCreditBalance.monthlyLimit}`}
            ><><span className={styles.creditCoin}><CoinIcon /></span><span className={styles.creditCopy}><small>Créditos IA</small><strong>{aiCreditBalance.available.toLocaleString("pt-BR")}</strong></span>{aiCreditBalance.monthlyLimit > 0 ? <span className={styles.creditLimit}>/{aiCreditBalance.monthlyLimit.toLocaleString("pt-BR")}</span> : null}</></div>}
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
          </div>
        </header>

        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}

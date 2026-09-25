"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/infrastructure/auth/auth-client";
import styles from "./AppShell.module.css";

type Notification = {
  id: string;
  kind: "publication" | "deadline" | "task" | "agenda";
  title: string;
  description: string;
  href: string;
  createdAt: string;
  read: boolean;
  bucket: "new" | "pending" | "late";
};

type Props = {
  userName: string;
  userEmail: string;
  userImage: string | null;
  role: string;
  organizationName: string;
  userOab: string | null;
  jobTitle: string | null;
  accessLevel: string | null;
  sessionStartedAt: string | null;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "JP";
  return `${parts[0]?.[0] ?? ""}${parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : ""}`.toUpperCase();
}

function roleLabel(role: string, accessLevel: string | null) {
  if (role === "owner") return "Proprietário";
  if (accessLevel === "LEVEL_2") return "Nível 2";
  if (accessLevel === "LEVEL_1") return "Nível 1";
  if (role === "admin") return "Administrador";
  return "Equipe";
}

function notificationIcon(kind: Notification["kind"]) {
  if (kind === "publication") return "✉";
  if (kind === "deadline") return "!";
  if (kind === "task") return "✓";
  return "□";
}

function timeAgo(value: string) {
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (!Number.isFinite(diff) || diff < 0) return "agora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} dia${days > 1 ? "s" : ""}`;
  return date.toLocaleDateString("pt-BR");
}

export function TopbarUserControls({
  userName,
  userEmail,
  userImage: initialImage,
  role,
  organizationName,
  userOab,
  jobTitle,
  accessLevel,
  sessionStartedAt,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationTab, setNotificationTab] = useState<Notification["bucket"]>("new");
  const [notificationCounts, setNotificationCounts] = useState({ new: 0, pending: 0, late: 0 });
  const [notificationsTruncated, setNotificationsTruncated] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [image, setImage] = useState<string | null>(initialImage);
  const [name, setName] = useState(userName);
  const [nameDraft, setNameDraft] = useState(userName);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const displayRole = useMemo(() => roleLabel(role, accessLevel), [role, accessLevel]);

  async function loadNotifications() {
    const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const payload = await response.json() as {
      notifications?: Notification[];
      unreadCount?: number;
      counts?: { new: number; pending: number; late: number };
      truncated?: boolean;
    };
    setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
    setUnreadCount(typeof payload.unreadCount === "number" ? payload.unreadCount : 0);
    setNotificationCounts(payload.counts ?? { new: 0, pending: 0, late: 0 });
    setNotificationsTruncated(payload.truncated === true);
  }

  useEffect(() => {
    void loadNotifications();
    const timer = window.setInterval(() => void loadNotifications(), 60_000);
    return () => window.clearInterval(timer);
  // Recarrega ao trocar de área porque uma ação pode ter criado ou resolvido um alerta.
  }, [pathname]);

  useEffect(() => {
    function outside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setNotificationOpen(false);
        setProfileOpen(false);
      }
    }
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationOpen(false);
        setProfileOpen(false);
        setDrawerOpen(false);
      }
    }
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", keydown);
    };
  }, []);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    // A API valida até 30 IDs por requisição; não marcar localmente algo que ela recusou.
    for (let index = 0; index < ids.length; index += 30) {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: ids.slice(index, index + 30) }),
      }).catch(() => null);
      if (!response?.ok) break;
    }
    await loadNotifications();
  }

  async function openNotification(item: Notification) {
    if (!item.read) await markRead([item.id]);
    setNotificationOpen(false);
    router.push(item.href);
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (trimmed.length < 2 || trimmed === name) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/settings/account", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    setBusy(false);
    if (!response.ok) {
      setMessage("Não foi possível salvar o nome agora.");
      return;
    }
    setName(trimmed);
    setNameDraft(trimmed);
    setMessage("Dados atualizados.");
    router.refresh();
  }

  async function uploadPhoto(file: File | null) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.set("file", file);
    const response = await fetch("/api/settings/profile-photo", { method: "POST", body: form });
    const payload = await response.json().catch(() => null) as { image?: string; error?: string } | null;
    setBusy(false);
    if (!response.ok || !payload?.image) {
      setMessage(payload?.error === "IMAGE_TOO_LARGE" ? "Use uma imagem de até 500 KB." : "Não foi possível atualizar a foto.");
      return;
    }
    setImage(payload.image);
    setMessage("Foto atualizada.");
    if (fileRef.current) fileRef.current.value = "";
    router.refresh();
  }

  async function removePhoto() {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/settings/profile-photo", { method: "DELETE" });
    setBusy(false);
    if (!response.ok) {
      setMessage("Não foi possível remover a foto.");
      return;
    }
    setImage(null);
    setMessage("Foto removida.");
    router.refresh();
  }

  async function signOut() {
    setBusy(true);
    await fetch("/api/team/session/end", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: "manual" }),
      keepalive: true,
    }).catch(() => undefined);
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const sessionLabel = sessionStartedAt
    ? new Date(sessionStartedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "Sessão atual";

  return (
    <div className={styles.userArea} ref={rootRef}>
      <div className={styles.popoverAnchor}>
        <button
          className={styles.iconButton}
          type="button"
          aria-label="Notificações"
          aria-expanded={notificationOpen}
          onClick={() => { setNotificationOpen((value) => !value); setProfileOpen(false); }}
        >
          <svg className={styles.bellIcon} viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
          {unreadCount > 0 ? <i>{unreadCount > 9 ? "9+" : unreadCount}</i> : null}
        </button>
        {notificationOpen ? <section className={styles.notificationPopover} aria-label="Notificações">
          <div className={styles.popoverHead}>
            <div><strong>Notificações</strong><span>{unreadCount ? `${unreadCount} não lida${unreadCount > 1 ? "s" : ""}` : "Tudo em dia"}</span></div>
            {unreadCount ? <button type="button" onClick={() => void markRead(notifications.filter((item) => !item.read).map((item) => item.id))}>Marcar visíveis como lidas</button> : null}
          </div>
          <div className={styles.notificationTabs} role="tablist" aria-label="Organizar notificações">
            {([ ["new", "Novos"], ["pending", "Pendentes"], ["late", "Atrasados"] ] as const).map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={notificationTab === key}
                className={notificationTab === key ? styles.notificationTabActive : ""}
                onClick={() => setNotificationTab(key)}>
                {label} <span>{notificationCounts[key]}</span>
              </button>
            ))}
          </div>
          {notificationTab === "late" ? <p className={styles.notificationHint}>Mais de 14 dias sem tratamento no Jurisportal. Isso não significa prazo judicial vencido.</p> : null}
          <div className={styles.notificationList} role="tabpanel">
            {notifications.filter((item) => item.bucket === notificationTab).length === 0
              ? <div className={styles.emptyPopover}>Nenhuma notificação nesta área.</div>
              : notifications.filter((item) => item.bucket === notificationTab).map((item) => <button key={item.id} type="button" className={`${styles.notificationItem} ${!item.read ? styles.notificationUnread : ""}`} onClick={() => void openNotification(item)}>
                <span className={styles.notificationKind}>{notificationIcon(item.kind)}</span>
                <span className={styles.notificationCopy}><strong>{item.title}</strong><small>{item.description}</small><em>{timeAgo(item.createdAt)}</em></span>
              </button>)}
          </div>
          {notificationsTruncated || notificationCounts[notificationTab] > notifications.filter((item) => item.bucket === notificationTab).length
            ? <button className={styles.popoverFooter} type="button" onClick={() => { setNotificationOpen(false); router.push("/app/publicacoes"); }}>Existem mais registros. Consultar publicações e intimações</button>
            : null}
          <button className={styles.popoverFooter} type="button" onClick={() => { setNotificationOpen(false); router.push("/app/configuracoes?tab=notificacoes"); }}>Preferências de notificações</button>
        </section> : null}
      </div>

      <div className={styles.popoverAnchor}>
        <button
          className={styles.profileTrigger}
          type="button"
          aria-expanded={profileOpen}
          onClick={() => { setProfileOpen((value) => !value); setNotificationOpen(false); }}
        >
          <span className={`${styles.avatar} ${image ? styles.avatarPhoto : ""}`} style={image ? { backgroundImage: `url(${image})` } : undefined}>{image ? "" : initials(name)}</span>
          <span className={styles.userText}><strong>{name}</strong><span>{displayRole}</span></span>
          <span className={styles.profileChevron}>⌄</span>
        </button>

        {profileOpen ? <div className={styles.profilePopover}>
          <div className={styles.profileSummary}>
            <span className={`${styles.avatarLarge} ${image ? styles.avatarPhoto : ""}`} style={image ? { backgroundImage: `url(${image})` } : undefined}>{image ? "" : initials(name)}</span>
            <div><strong>{name}</strong><span>{userEmail}</span></div>
          </div>
          <button type="button" onClick={() => { setProfileOpen(false); setDrawerOpen(true); }}>Meu perfil</button>
          <button type="button" onClick={() => { setProfileOpen(false); router.push("/app/configuracoes"); }}>Configurações</button>
          <button type="button" onClick={() => { setProfileOpen(false); router.push("/app/plano"); }}>Plano e cobrança</button>
          <hr />
          <button className={styles.dangerMenu} type="button" disabled={busy} onClick={() => void signOut()}>{busy ? "Saindo..." : "Sair"}</button>
        </div> : null}
      </div>

      {drawerOpen ? <div className={styles.drawerBackdrop} onMouseDown={(event) => { if (event.currentTarget === event.target) setDrawerOpen(false); }}>
        <aside className={styles.profileDrawer} aria-modal="true" role="dialog" aria-label="Meu perfil">
          <div className={styles.drawerHead}><div><span>Conta</span><h2>Meu perfil</h2></div><button type="button" aria-label="Fechar" onClick={() => setDrawerOpen(false)}>×</button></div>
          <div className={styles.drawerBody}>
            <section className={styles.photoSection}>
              <span className={`${styles.avatarXL} ${image ? styles.avatarPhoto : ""}`} style={image ? { backgroundImage: `url(${image})` } : undefined}>{image ? "" : initials(name)}</span>
              <div><strong>Foto de perfil</strong><span>JPG, PNG ou WebP, até 500 KB.</span><div className={styles.inlineActions}><button type="button" disabled={busy} onClick={() => fileRef.current?.click()}>Alterar foto</button>{image ? <button type="button" disabled={busy} onClick={() => void removePhoto()}>Remover</button> : null}</div></div>
              <input ref={fileRef} className={styles.hiddenInput} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event.target.files?.[0] ?? null)} />
            </section>

            {message ? <p className={styles.drawerMessage}>{message}</p> : null}

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionHead}><strong>Dados pessoais</strong><span>Informações usadas para identificar sua conta.</span></div>
              <label>Nome<input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} maxLength={160} /></label>
              <label>E-mail<input value={userEmail} readOnly /></label>
              <button className={styles.drawerPrimary} type="button" disabled={busy || nameDraft.trim() === name} onClick={() => void saveName()}>Salvar nome</button>
            </section>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionHead}><strong>Informações profissionais</strong><span>Dados vinculados ao escritório atual.</span></div>
              <div className={styles.profileFacts}>
                <div><span>Escritório</span><strong>{organizationName}</strong></div>
                <div><span>Acesso</span><strong>{displayRole}</strong></div>
                <div><span>Função</span><strong>{jobTitle || (role === "owner" ? "Advogado responsável" : "Integrante da equipe")}</strong></div>
                <div><span>OAB</span><strong>{userOab || "Não encontrada"}</strong></div>
              </div>
            </section>

            <section className={styles.drawerSection}>
              <div className={styles.drawerSectionHead}><strong>Segurança</strong><span>Sessão iniciada em {sessionLabel}.</span></div>
              <div className={styles.inlineActions}>
                <button type="button" onClick={() => { setDrawerOpen(false); router.push("/app/configuracoes?tab=seguranca"); }}>Abrir segurança</button>
                <button type="button" onClick={() => { setDrawerOpen(false); router.push("/app/configuracoes"); }}>Configurações</button>
              </div>
            </section>
          </div>
        </aside>
      </div> : null}
    </div>
  );
}

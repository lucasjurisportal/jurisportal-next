"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/infrastructure/auth/auth-client";
import {
  LAST_INTERACTION_STORAGE_KEY,
  STAFF_ACTIVE_WINDOW_MS,
  getLogoutWindowMs,
  resolveInactivityProfile,
} from "@/modules/team/domain/team-activity-policy";
import styles from "./ActivityGuard.module.css";

const HEARTBEAT_MS = 5 * 60 * 1000;
const CHECK_MS = 15 * 1000;
const ADMIN_NOTICE_MS = 5 * 1000;

type Props = {
  role: string;
};

export function ActivityGuard({ role }: Props) {
  const router = useRouter();
  const profile = resolveInactivityProfile(role);
  const logoutWindowMs = getLogoutWindowMs(role);
  const signingOutRef = useRef(false);
  const lastInteractionRef = useRef(Date.now());
  const [adminTimeoutNotice, setAdminTimeoutNotice] = useState(false);

  const readSharedLastInteraction = useCallback(() => {
    const stored = Number(window.localStorage.getItem(LAST_INTERACTION_STORAGE_KEY) ?? 0);
    if (Number.isFinite(stored) && stored > lastInteractionRef.current) {
      lastInteractionRef.current = stored;
    }
    return lastInteractionRef.current;
  }, []);

  const persistInteraction = useCallback((at: number) => {
    lastInteractionRef.current = at;
    window.localStorage.setItem(LAST_INTERACTION_STORAGE_KEY, String(at));
  }, []);

  const signOutForInactivity = useCallback(
    async (admin: boolean) => {
      if (signingOutRef.current) return;
      signingOutRef.current = true;

      if (admin) {
        setAdminTimeoutNotice(true);
        await new Promise<void>((resolve) => window.setTimeout(resolve, ADMIN_NOTICE_MS));
      }

      await fetch("/api/team/session/end", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "inactivity" }),
        keepalive: true,
      }).catch(() => undefined);

      await authClient.signOut();
      router.push(admin ? "/login?motivo=inatividade-administrador" : "/login?motivo=inatividade");
      router.refresh();
    },
    [router],
  );

  const verifyTimeout = useCallback(() => {
    if (signingOutRef.current) return true;
    const idleFor = Date.now() - readSharedLastInteraction();
    if (idleFor < logoutWindowMs) return false;
    void signOutForInactivity(profile === "ADMIN");
    return true;
  }, [logoutWindowMs, profile, readSharedLastInteraction, signOutForInactivity]);

  useEffect(() => {
    // O endpoint é idempotente por sessionId e só registra funcionários.
    // Proprietário/administrador continua fora do controle de produtividade.
    void fetch("/api/team/session/start", { method: "POST", keepalive: true }).catch(() => undefined);

    // Em uma sessão retomada, não zeramos silenciosamente um período que já excedeu
    // o limite. Um login novo grava uma nova interação antes de entrar no /app.
    const stored = Number(window.localStorage.getItem(LAST_INTERACTION_STORAGE_KEY) ?? 0);
    if (Number.isFinite(stored) && stored > 0) lastInteractionRef.current = stored;
    if (Date.now() - lastInteractionRef.current >= logoutWindowMs) {
      verifyTimeout();
    } else {
      persistInteraction(Date.now());
    }

    const markInteraction = () => {
      // Se o limite já venceu, a primeira interação não pode simplesmente zerar o relógio.
      if (verifyTimeout()) return;
      persistInteraction(Date.now());
    };

    const onStorage = (event: StorageEvent) => {
      if (event.key !== LAST_INTERACTION_STORAGE_KEY || !event.newValue) return;
      const at = Number(event.newValue);
      if (Number.isFinite(at) && at > lastInteractionRef.current) lastInteractionRef.current = at;
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") verifyTimeout();
    };

    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, markInteraction, { passive: true }));
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const checkTimer = window.setInterval(() => verifyTimeout(), CHECK_MS);

    let heartbeatTimer: number | null = null;
    if (profile === "STAFF") {
      const heartbeat = async () => {
        const idleFor = Date.now() - readSharedLastInteraction();
        if (idleFor < STAFF_ACTIVE_WINDOW_MS) {
          await fetch("/api/team/heartbeat", { method: "POST", keepalive: true }).catch(
            () => undefined,
          );
        }
      };
      void heartbeat();
      heartbeatTimer = window.setInterval(() => void heartbeat(), HEARTBEAT_MS);
    }

    return () => {
      window.clearInterval(checkTimer);
      if (heartbeatTimer !== null) window.clearInterval(heartbeatTimer);
      events.forEach((event) => window.removeEventListener(event, markInteraction));
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [logoutWindowMs, persistInteraction, profile, readSharedLastInteraction, verifyTimeout]);

  if (!adminTimeoutNotice) return null;

  return (
    <div className={styles.backdrop} role="alertdialog" aria-modal="true" aria-live="assertive">
      <div className={styles.card}>
        <span className={styles.eyebrow}>Segurança da conta</span>
        <h2>1 hora sem atividade</h2>
        <p>
          O Jurisportal ficou uma hora sem registrar atividade nesta conta. Por segurança, a
          sessão será encerrada e será necessário entrar novamente.
        </p>
      </div>
    </div>
  );
}

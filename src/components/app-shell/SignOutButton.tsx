"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/infrastructure/auth/auth-client";
import styles from "./AppShell.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
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

  return (
    <button className={styles.signOutButton} type="button" onClick={signOut} disabled={pending}>
      {pending ? "Saindo..." : "Sair"}
    </button>
  );
}

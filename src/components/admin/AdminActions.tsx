"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/infrastructure/auth/auth-client";

export function AdminActions() {
  const router = useRouter();
  const [pending, setPending] = useState<"internal" | "logout" | null>(null);
  const [error, setError] = useState("");

  async function openInternalWorkspace() {
    setPending("internal");
    setError("");
    try {
      const response = await fetch("/api/admin/session/activate-internal", { method: "POST" });
      if (!response.ok) {
        setError("Não foi possível abrir o ambiente interno agora.");
        return;
      }
      router.push("/app/dashboard");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function signOutAdmin() {
    setPending("logout");
    setError("");
    await authClient.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "20px 0 8px" }}>
      <button
        type="button"
        onClick={openInternalWorkspace}
        disabled={pending !== null}
        style={{ border: 0, borderRadius: 10, background: "#1555d6", color: "white", padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        {pending === "internal" ? "Abrindo..." : "Abrir Jurisportal Internal"}
      </button>
      <button
        type="button"
        onClick={signOutAdmin}
        disabled={pending !== null}
        style={{ border: "1px solid #dbe3ee", borderRadius: 10, background: "white", color: "#18324f", padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}
      >
        {pending === "logout" ? "Saindo..." : "Sair da administração"}
      </button>
      {error ? <span style={{ color: "#a52525", fontSize: 12, fontWeight: 700 }}>{error}</span> : null}
    </div>
  );
}

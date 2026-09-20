"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./Processes.module.css";

export function ProcessWorkItemStatusButton({ processId, workItemId, status }: { processId: string; workItemId: string; status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const target = status === "DONE" ? "OPEN" : "DONE";
  async function change() {
    setLoading(true);
    const response = await fetch(`/api/processes/${processId}/work-items/${workItemId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: target }),
    });
    setLoading(false);
    if (response.ok) router.refresh();
  }
  return <button className={styles.rowActionButton} disabled={loading} onClick={change}>{loading ? "..." : status === "DONE" ? "Reabrir" : "Concluir"}</button>;
}

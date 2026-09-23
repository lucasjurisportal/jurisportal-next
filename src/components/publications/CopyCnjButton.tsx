"use client";

import { useState } from "react";
import styles from "./Publications.module.css";

/** O navegador não autoriza preencher formulários de outro tribunal/origem diretamente. */
export function CopyCnjButton({ cnj }: { cnj: string }) {
  const [copied, setCopied] = useState(false);
  return <button className={styles.secondaryButton} type="button" onClick={async () => {
    try {
      await navigator.clipboard.writeText(cnj);
      setCopied(true);
    } catch { setCopied(false); }
  }}>{copied ? "Número copiado" : "Copiar número CNJ"}</button>;
}

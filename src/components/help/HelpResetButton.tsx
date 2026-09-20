"use client";

import { useState } from "react";
import type { HelpModuleKey } from "@/modules/help/domain/help-content";
import styles from "./Help.module.css";

export function HelpResetButton({ moduleKey }: { moduleKey?: HelpModuleKey }) {
  const [done, setDone] = useState(false);
  function reset() {
    if (moduleKey) window.localStorage.removeItem(`jp-help-hidden:${moduleKey}`);
    else {
      for (const key of Object.keys(window.localStorage)) if (key.startsWith("jp-help-hidden:")) window.localStorage.removeItem(key);
    }
    setDone(true);
    window.setTimeout(() => setDone(false), 2200);
  }
  return <button className={styles.resetButton} type="button" onClick={reset}>{done ? "Tutorial reativado" : moduleKey ? "Mostrar tutorial ao entrar" : "Reativar todos os tutoriais"}</button>;
}

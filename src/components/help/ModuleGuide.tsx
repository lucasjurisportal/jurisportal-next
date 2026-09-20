"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { helpModuleForPath } from "@/modules/help/domain/help-content";
import styles from "./Help.module.css";

export function ModuleGuide() {
  const pathname = usePathname();
  const module = helpModuleForPath(pathname);
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!module) { setOpen(false); return; }
    const hidden = window.localStorage.getItem(`jp-help-hidden:${module.key}`) === "1";
    setDontShowAgain(hidden);
    setOpen(!hidden);
  }, [module?.key]);

  if (!module || !open) return null;

  const moduleKey = module.key;

  function close() {
    if (dontShowAgain) {
  window.localStorage.setItem(`jp-help-hidden:${moduleKey}`, "1");
}
    setOpen(false);
  }

  return (
    <div className={styles.guideBackdrop} role="dialog" aria-modal="true" aria-labelledby="module-guide-title">
      <section className={styles.guideCard}>
        <button className={styles.closeButton} type="button" onClick={close} aria-label="Fechar tutorial">×</button>
        <span className={styles.eyebrow}>Primeiros passos</span>
        <h2 id="module-guide-title">{module.title}</h2>
        <p>{module.description}</p>
        <ol>{module.steps.slice(0, 4).map((step) => <li key={step}>{step}</li>)}</ol>
        <label className={styles.neverAgain}>
          <input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />
          Não mostrar esta explicação novamente
        </label>
        <div className={styles.guideActions}>
          <Link href={`/app/ajuda#${module.key}`} onClick={close}>Ver tutorial completo</Link>
          <button type="button" onClick={close}>Entendi</button>
        </div>
      </section>
    </div>
  );
}

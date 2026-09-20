"use client";

import styles from "./Reports.module.css";

type Props = {
  exportHref?: string;
  exportLabel?: string;
  print?: boolean;
};

export function ReportActions({ exportHref, exportLabel = "Exportar CSV", print = false }: Props) {
  return (
    <div className={`${styles.actions} ${styles.noPrint}`}>
      {exportHref ? <a className={styles.secondaryButton} href={exportHref}>{exportLabel}</a> : null}
      {print ? <button className={styles.primaryButton} type="button" onClick={() => window.print()}>Imprimir / salvar PDF</button> : null}
    </div>
  );
}

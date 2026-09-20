import Image from "next/image";
import styles from "./Auth.module.css";

export function SecurityPageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <Image
          className={styles.authLogo}
          src="/brand/jurisportal-logo-original.png"
          alt="Jurisportal - Menos burocracia. Mais advocacia."
          width={1743}
          height={845}
          priority
        />
        <div>
          <h1>Segurança sem transformar a rotina em burocracia.</h1>
          <p>Uma etapa curta para proteger dados jurídicos, clientes e acessos do escritório.</p>
        </div>
        <span>Menos burocracia. Mais advocacia.</span>
      </aside>
      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}

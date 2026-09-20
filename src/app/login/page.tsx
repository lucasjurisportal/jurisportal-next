import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "@/components/auth/Auth.module.css";

export default function LoginPage() {
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
          <h1>Entre sabendo o que precisa ser feito.</h1>
          <p>Menos conferência manual. Mais clareza para começar o dia.</p>
        </div>
        <span>Menos burocracia. Mais advocacia.</span>
      </aside>
      <section className={styles.formPanel}>
        <Suspense fallback={<div className={styles.card}>Carregando...</div>}>
          <LoginForm />
        </Suspense>
      </section>
    </main>
  );
}

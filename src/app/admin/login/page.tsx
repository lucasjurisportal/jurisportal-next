import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import styles from "@/components/auth/Auth.module.css";

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <aside className={styles.brandPanel}>
        <Image
          className={styles.authLogo}
          src="/brand/jurisportal-logo-original.png"
          alt="Jurisportal"
          width={1743}
          height={845}
          priority
        />
        <div>
          <h1>Administração da plataforma.</h1>
          <p>Entrada restrita, auditada e protegida por segundo fator.</p>
        </div>
        <span>Jurisportal Next</span>
      </aside>
      <section className={styles.formPanel}>
        <Suspense fallback={<div className={styles.card}>Carregando...</div>}>
          <LoginForm adminMode nextPath="/admin" />
        </Suspense>
      </section>
    </main>
  );
}

import Image from "next/image";
import { Suspense } from "react";
import { SignupForm } from "@/components/auth/SignupForm";
import styles from "@/components/auth/Auth.module.css";

export default function CadastroPage() {
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
          <h1>Organize o escritório antes que a rotina organize você.</h1>
          <p>Escolha seu plano, cadastre o escritório e deixe o sistema pronto para a próxima etapa.</p>
        </div>
        <span>Menos burocracia. Mais advocacia.</span>
      </aside>
      <section className={styles.formPanel}>
        <Suspense fallback={<div>Carregando cadastro...</div>}><SignupForm /></Suspense>
      </section>
    </main>
  );
}

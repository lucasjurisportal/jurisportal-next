import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getSettingsData } from "@/modules/settings/application/settings-service";
import { SettingsManager } from "@/components/settings/SettingsManager";
import styles from "@/components/settings/Settings.module.css";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const raw = await searchParams;
  const requestedTab = typeof raw.tab === "string" ? raw.tab : undefined;
  const data = await getSettingsData(context.workspace.organizationId, context.user.id);
  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>Seu Jurisportal</span>
          <h1>Configurações</h1>
          <p>Atualize seus dados, informações do escritório, segurança, notificações e importações.</p>
        </div>
      </section>
      <SettingsManager
        initial={data}
        allowReferrals
        initialTab={requestedTab}
        isOwner={context.workspace.role === "owner"}
        planName={context.workspace.plan.name}
        oabLimit={context.workspace.plan.oabs}
        processLimit={context.workspace.plan.registeredProcessLimit}
        clientLimit={context.workspace.plan.clientsLimit}
      />
    </div>
  );
}

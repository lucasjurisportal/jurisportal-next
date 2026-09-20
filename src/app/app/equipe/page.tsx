import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { getTeamUsage, listTeamMembers } from "@/modules/team/application/team-service";
import { TeamManager } from "@/components/team/TeamManager";
import styles from "@/components/team/Team.module.css";

export default async function TeamPage() {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");

  const available = hasCapability(context.workspace.plan, "team.members");
  if (!available) {
    return (
      <div className={styles.page}>
        <section className={styles.heading}>
          <span className={styles.eyebrow}>Equipe</span>
          <h1>Equipe do escritório</h1>
          <p>
            Seu plano atual comporta apenas o usuário proprietário. A gestão de equipe começa no
            plano Estratégico.
          </p>
        </section>
      </div>
    );
  }

  const [members, usage] = await Promise.all([
    listTeamMembers(context.workspace.organizationId),
    getTeamUsage(context.workspace.organizationId),
  ]);

  return (
    <div className={styles.page}>
      <section className={styles.heading}>
        <span className={styles.eyebrow}>Equipe</span>
        <h1>Equipe do escritório</h1>
        <p>
          Cada auxiliar pertence exclusivamente a esta conta e ocupa uma vaga de usuário e uma vaga
          de OAB do plano. Não há compartilhamento entre escritórios nesta fase.
        </p>
      </section>
      <TeamManager
        members={members}
        userLimit={context.workspace.plan.users}
        oabLimit={context.workspace.plan.oabs}
        userUsage={usage.users}
        oabUsage={usage.oabs}
        isOwner={context.workspace.role === "owner"}
      />
    </div>
  );
}

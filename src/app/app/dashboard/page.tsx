import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/Dashboard";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getDashboardData } from "@/modules/dashboard/application/dashboard-service";

export default async function DashboardPage() {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  const data = await getDashboardData({
    organizationId: context.workspace.organizationId,
    userId: context.user.id,
    role: context.workspace.role,
  });
  return <Dashboard data={data} userName={context.user.name} role={context.workspace.role} processLimit={context.workspace.plan.registeredProcessLimit} />;
}

import { redirect } from "next/navigation";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";
import { PlanBillingPreview } from "@/components/plans/PlanBillingPreview";
import { prisma } from "@/infrastructure/database/prisma";

export default async function PlanBillingPage() {
  const context = await getAppContext();
  if (!context.ok) redirect("/login");
  if (context.workspace.role !== "owner") redirect("/app/dashboard");

  const subscription = context.workspace.subscription;
  const processCount = await prisma.process.count({ where: { organizationId: context.workspace.organizationId } });
  return <PlanBillingPreview
    organizationName={context.workspace.organizationName}
    ownerName={context.user.name}
    ownerEmail={context.user.email}
    plans={[...planCatalog]}
    currentPlanSlug={context.workspace.plan.slug}
    currentCycle={subscription?.billingCycle === "annual" ? "annual" : "monthly"}
    processCount={processCount}
    subscriptionStatus={context.workspace.pilotAccess ? "pilot" : subscription?.status ?? null}
    pilotEndsAt={context.workspace.pilotAccess?.expiresAt.toISOString() ?? null}
    periodEnd={subscription?.currentPeriodEnd?.toISOString() ?? null}
  />;
}

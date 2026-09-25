import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell/AppShell";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getCurrentWorkspace } from "@/modules/organizations/application/get-current-workspace";
import { hasVerifiedSecondFactor } from "@/modules/security/application/session-guard";
import { getUserSecurityState } from "@/modules/security/application/security-service";
import { TRUSTED_DEVICE_COOKIE } from "@/modules/security/domain/security-policy";

export default async function ProtectedAppLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session?.user) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified) redirect("/verificar-email?next=%2Fapp%2Fdashboard");

  const teamProfile = await prisma.teamMemberProfile.findUnique({ where: { userId: session.user.id } });
  if (teamProfile?.status === "ACTIVE" && teamProfile.mustChangePassword) redirect("/trocar-senha-inicial");

  const securityState = await getUserSecurityState(session.user.id);
  if (securityState?.recoveryRequired) redirect("/recuperar-acesso?next=%2Fapp%2Fdashboard");

  const cookieStore = await cookies();
  const secondFactorOk = await hasVerifiedSecondFactor({
    userId: session.user.id,
    sessionId: session.session.id,
    trustedDeviceToken: cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value,
    userAgent: requestHeaders.get("user-agent"),
  });
  if (!secondFactorOk) redirect("/verificar-acesso?next=%2Fapp%2Fdashboard");

  const workspace = await getCurrentWorkspace(
    session.user.id,
    session.session.activeOrganizationId ?? null,
  );

  if (!workspace) redirect("/cadastro?retomar=1");

  const [processCount, currentOab, currentSession] = await Promise.all([
    prisma.process.count({ where: { organizationId: workspace.organizationId } }),
    prisma.lawyerOab.findFirst({
      where: { organizationId: workspace.organizationId, userId: session.user.id, isActive: true },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      select: { rawNumber: true, state: true },
    }),
    prisma.session.findUnique({ where: { id: session.session.id }, select: { createdAt: true } }),
  ]);

  return (
    <AppShell
      organizationName={workspace.organizationName}
      userName={user.name}
      userId={user.id}
      userEmail={user.email}
      userImage={user.image}
      role={workspace.role}
      userOab={currentOab ? `${currentOab.rawNumber} / ${currentOab.state}` : null}
      jobTitle={teamProfile?.jobTitle ?? null}
      accessLevel={teamProfile?.accessLevel ?? null}
      sessionStartedAt={currentSession?.createdAt.toISOString() ?? null}
      planName={workspace.plan.name}
      processCount={processCount}
      processLimit={workspace.plan.registeredProcessLimit}
      subscriptionStatus={workspace.subscription?.status ?? "unknown"}
    >
      {children}
    </AppShell>
  );
}

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { hasVerifiedSecondFactor } from "@/modules/security/application/session-guard";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";
import { getUserSecurityState } from "@/modules/security/application/security-service";
import { TRUSTED_DEVICE_COOKIE } from "@/modules/security/domain/security-policy";
import { AdminActions } from "@/components/admin/AdminActions";

export default async function AdminPage() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user) redirect("/admin/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified) redirect("/verificar-email?next=%2Fadmin");

  const securityState = await getUserSecurityState(session.user.id);
  if (securityState?.recoveryRequired) redirect("/recuperar-acesso?next=%2Fadmin");

  const cookieStore = await cookies();
  const verified = await hasVerifiedSecondFactor({
    userId: session.user.id,
    sessionId: session.session.id,
    trustedDeviceToken: cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value,
    userAgent: requestHeaders.get("user-agent"),
  });
  if (!verified) redirect("/verificar-acesso?next=%2Fadmin");

  const master = await isPlatformMaster(session.user.id);
  if (!master) {
    return (
      <main style={{ maxWidth: 760, margin: "80px auto", padding: 24, fontFamily: "Arial, sans-serif" }}>
        <h1>Acesso administrativo negado</h1>
        <p>Esta conta é válida no Jurisportal, mas não possui papel PLATFORM_MASTER.</p>
      </main>
    );
  }

  const [users, organizations, subscriptions, recentSecurityEvents] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.subscription.count(),
    prisma.securityEvent.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "42px 24px", fontFamily: "Arial, sans-serif", color: "#172033" }}>
      <p style={{ color: "#1d4ed8", fontWeight: 800 }}>PLATFORM_MASTER</p>
      <h1>Administração do Jurisportal Next</h1>
      <p>Área global da plataforma. Rotas normais de clientes continuam obrigadas a respeitar organização e permissões.</p>
      <AdminActions />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 16, margin: "28px 0" }}>
        <div style={{ padding: 20, border: "1px solid #dbe4f0", borderRadius: 14 }}><strong>{users}</strong><div>usuários</div></div>
        <div style={{ padding: 20, border: "1px solid #dbe4f0", borderRadius: 14 }}><strong>{organizations}</strong><div>organizações</div></div>
        <div style={{ padding: 20, border: "1px solid #dbe4f0", borderRadius: 14 }}><strong>{subscriptions}</strong><div>assinaturas</div></div>
      </div>
      <section>
        <h2>Eventos recentes de segurança</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {recentSecurityEvents.map((event) => (
            <div key={event.id} style={{ padding: 12, border: "1px solid #e5e7eb", borderRadius: 10 }}>
              <strong>{event.type}</strong> · {event.success ? "sucesso" : "falha"} · {event.createdAt.toLocaleString("pt-BR")}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

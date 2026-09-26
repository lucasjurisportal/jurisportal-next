import { prisma } from "@/infrastructure/database/prisma";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";
import { pilotEntitlement } from "@/modules/promotions/domain/promotion";

const membershipInclude = {
  organization: {
    include: {
      subscription: true,
      profile: true,
      pilotAccess: true,
    },
  },
} as const;

export async function getCurrentWorkspace(userId: string, activeOrganizationId?: string | null) {
  let membership = null;

  // 1) Respeita a organização explicitamente ativa na sessão quando ela ainda existe.
  if (activeOrganizationId) {
    membership = await prisma.member.findFirst({
      where: { userId, organizationId: activeOrganizationId },
      include: membershipInclude,
    });
  }

  // 2) PLATFORM_MASTER sem organização válida cai sempre no ambiente interno.
  // Isso evita uma nova sessão voltar por engano ao escritório Free criado no onboarding.
  if (!membership) {
    const platformAdmin = await prisma.platformAdmin.findUnique({
      where: { userId },
      select: { active: true },
    });

    if (platformAdmin?.active) {
      membership = await prisma.member.findFirst({
        where: {
          userId,
          organization: { slug: "jurisportal-internal" },
        },
        include: membershipInclude,
      });
    }
  }

  // 3) Usuário comum usa o primeiro escritório do qual é membro.
  if (!membership) {
    membership = await prisma.member.findFirst({
      where: { userId },
      include: membershipInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  if (!membership) return null;

  const subscription = membership.organization.subscription;
  const pilot = membership.organization.pilotAccess;
  const pilotPlanSlug = pilotEntitlement({
    status: subscription?.status, pilot,
    validPlanSlugs: planCatalog.map((item) => item.slug),
  });
  const planSlug = pilotPlanSlug ?? subscription?.planSlug ?? "free";
  const plan = planCatalog.find((item) => item.slug === planSlug) ?? planCatalog[0];

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    role: membership.role,
    subscription,
    pilotAccess: pilotPlanSlug ? { planSlug: pilotPlanSlug, expiresAt: pilot!.expiresAt } : null,
    plan,
  };
}

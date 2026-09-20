import { prisma } from "@/infrastructure/database/prisma";
import { planCatalog } from "@/modules/plans/domain/plan.catalog";

const membershipInclude = {
  organization: {
    include: {
      subscription: true,
      profile: true,
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

  const planSlug = membership.organization.subscription?.planSlug ?? "free";
  const plan = planCatalog.find((item) => item.slug === planSlug) ?? planCatalog[0];

  return {
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    role: membership.role,
    subscription: membership.organization.subscription,
    plan,
  };
}

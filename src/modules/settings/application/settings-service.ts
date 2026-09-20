import { prisma } from "@/infrastructure/database/prisma";
import type { AccountSettingsInput, NotificationSettingsInput, OfficeSettingsInput } from "../domain/settings.schema";

export type OrganizationMetadataSettings = {
  version: 1;
  office?: {
    legalName?: string;
    taxId?: string;
    adminEmail?: string;
    whatsapp?: string;
  };
  notifications?: {
    publicationsEmail: boolean;
    publicationsWhatsapp: boolean;
    deadlinesEmail: boolean;
    deadlinesWhatsapp: boolean;
    syncFailureEmail: boolean;
    syncFailureWhatsapp: boolean;
    dailyOwnerReportEmail: boolean;
  };
  [key: string]: unknown;
};

export const defaultNotifications: OrganizationMetadataSettings["notifications"] = {
  publicationsEmail: true,
  publicationsWhatsapp: false,
  deadlinesEmail: true,
  deadlinesWhatsapp: false,
  syncFailureEmail: true,
  syncFailureWhatsapp: false,
  dailyOwnerReportEmail: true,
};

function parseMetadata(raw: string | null): OrganizationMetadataSettings {
  if (!raw) return { version: 1 };
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return { ...parsed, version: 1 } as OrganizationMetadataSettings;
  } catch {
    return { version: 1 };
  }
}

export async function getSettingsData(organizationId: string, userId: string) {
  const [user, organization, oabs, sessions] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, include: { profile: true } }),
    prisma.organization.findUnique({ where: { id: organizationId }, include: { profile: true, subscription: true } }),
    prisma.lawyerOab.findMany({
      where: { organizationId, isActive: true },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    }),
    prisma.session.count({ where: { userId, expiresAt: { gt: new Date() } } }),
  ]);
  if (!user || !organization) throw new Error("SETTINGS_CONTEXT_NOT_FOUND");
  const metadata = parseMetadata(organization.metadata);
  return {
    user: { id: user.id, name: user.name, email: user.email },
    office: {
      name: organization.name,
      logo: organization.logo,
      legalName: metadata.office?.legalName ?? "",
      taxId: metadata.office?.taxId ?? "",
      adminEmail: metadata.office?.adminEmail ?? "",
      whatsapp: metadata.office?.whatsapp ?? "",
      postalCode: organization.profile?.postalCode ?? "",
      street: organization.profile?.street ?? "",
      number: organization.profile?.number ?? "",
      complement: organization.profile?.complement ?? "",
      district: organization.profile?.district ?? "",
      city: organization.profile?.city ?? "",
      state: organization.profile?.state ?? "SP",
    },
    notifications: { ...defaultNotifications!, ...(metadata.notifications ?? {}) },
    oabs: oabs.map((oab) => ({ id: oab.id, rawNumber: oab.rawNumber, state: oab.state, isPrimary: oab.isPrimary, userId: oab.userId, userName: oab.user.name, userEmail: oab.user.email })),
    activeSessions: sessions,
  };
}

export async function updateAccountSettings(input: {
  organizationId: string;
  actorUserId: string;
  data: AccountSettingsInput;
}) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({ where: { id: input.actorUserId }, data: { name: input.data.name.trim() } });
    await tx.auditEvent.create({
      data: { organizationId: input.organizationId, actorUserId: input.actorUserId, category: "settings", action: "settings.account.updated", entityType: "user", entityId: input.actorUserId },
    });
    return user;
  });
}

export async function updateOfficeSettings(input: {
  organizationId: string;
  actorUserId: string;
  data: OfficeSettingsInput;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.organization.findUnique({ where: { id: input.organizationId }, select: { metadata: true } });
    if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
    const metadata = parseMetadata(current.metadata);
    metadata.office = {
      legalName: input.data.legalName?.trim() || undefined,
      taxId: input.data.taxId?.replace(/\D/g, "") || undefined,
      adminEmail: input.data.adminEmail?.trim().toLowerCase() || undefined,
      whatsapp: input.data.whatsapp?.replace(/\D/g, "") || undefined,
    };
    await tx.organization.update({
      where: { id: input.organizationId },
      data: { name: input.data.officeName.trim(), metadata: JSON.stringify(metadata) },
    });
    await tx.organizationProfile.upsert({
      where: { organizationId: input.organizationId },
      create: {
        organizationId: input.organizationId,
        postalCode: input.data.postalCode.replace(/\D/g, "").slice(0, 8), street: input.data.street.trim(), number: input.data.number.trim(), complement: input.data.complement?.trim() || null,
        district: input.data.district.trim(), city: input.data.city.trim(), state: input.data.state.toUpperCase(),
      },
      update: {
        postalCode: input.data.postalCode.replace(/\D/g, "").slice(0, 8), street: input.data.street.trim(), number: input.data.number.trim(), complement: input.data.complement?.trim() || null,
        district: input.data.district.trim(), city: input.data.city.trim(), state: input.data.state.toUpperCase(),
      },
    });
    await tx.auditEvent.create({
      data: { organizationId: input.organizationId, actorUserId: input.actorUserId, category: "settings", action: "settings.office.updated", entityType: "organization", entityId: input.organizationId },
    });
  });
}

export async function updateNotificationSettings(input: {
  organizationId: string;
  actorUserId: string;
  data: NotificationSettingsInput;
}) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.organization.findUnique({ where: { id: input.organizationId }, select: { metadata: true } });
    if (!current) throw new Error("ORGANIZATION_NOT_FOUND");
    const metadata = parseMetadata(current.metadata);
    metadata.notifications = input.data;
    await tx.organization.update({ where: { id: input.organizationId }, data: { metadata: JSON.stringify(metadata) } });
    await tx.auditEvent.create({
      data: { organizationId: input.organizationId, actorUserId: input.actorUserId, category: "settings", action: "settings.notifications.updated", entityType: "organization", entityId: input.organizationId },
    });
  });
}

export async function getOrganizationNotificationSettings(organizationId: string) {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { metadata: true } });
  const metadata = parseMetadata(organization?.metadata ?? null);
  return { ...defaultNotifications!, ...(metadata.notifications ?? {}) };
}

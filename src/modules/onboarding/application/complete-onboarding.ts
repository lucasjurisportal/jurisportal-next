import { randomUUID } from "node:crypto";
import { prisma } from "@/infrastructure/database/prisma";
import { createOab } from "@/modules/lawyers/domain/oab";
import { getCommercialPeriod } from "@/modules/plans/application/plan-pricing";
import { getPlanBySlug } from "@/modules/plans/application/plan-entitlements";
import { LEGAL_DOCUMENT_VERSIONS } from "@/modules/legal/domain/legal-document-versions";
import type { CompleteOnboardingInput } from "../domain/onboarding.schema";

function normalizePhone(value: string): string {
  return value.replace(/\D/g, "");
}

function normalizePostalCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

function normalizeState(value: string): string {
  return value.trim().toUpperCase();
}

function slugBase(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "escritorio";
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

type Context = {
  userId: string;
  sessionId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

/**
 * Finaliza o cadastro do primeiro escritório de um usuário autenticado.
 * A operação é idempotente: se o vínculo já existir, apenas devolvemos o workspace existente.
 */
export async function completeOnboarding(input: CompleteOnboardingInput, context: Context) {
  const existing = await prisma.member.findFirst({
    where: { userId: context.userId },
    include: { organization: { include: { subscription: true } } },
  });

  if (existing) {
    await prisma.session.updateMany({
      where: { id: context.sessionId, userId: context.userId },
      data: { activeOrganizationId: existing.organizationId },
    });

    return {
      organizationId: existing.organizationId,
      organizationName: existing.organization.name,
      planSlug: existing.organization.subscription?.planSlug ?? "free",
      alreadyCompleted: true,
    };
  }

  const plan = getPlanBySlug(input.planSlug);
  const oab = createOab(input.oabNumber, input.oabState);
  const now = new Date();
  const isFree = plan.slug === "free";
  const organizationId = randomUUID();
  const slug = `${slugBase(input.officeName)}-${organizationId.slice(0, 8)}`;

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        id: organizationId,
        name: input.officeName.trim(),
        slug,
      },
    });

    await tx.member.create({
      data: {
        organizationId: organization.id,
        userId: context.userId,
        role: "owner",
      },
    });

    await tx.userProfile.upsert({
      where: { userId: context.userId },
      create: {
        userId: context.userId,
        phone: normalizePhone(input.phone),
      },
      update: {
        phone: normalizePhone(input.phone),
      },
    });

    await tx.organizationProfile.create({
      data: {
        organizationId: organization.id,
        postalCode: normalizePostalCode(input.postalCode),
        street: input.street.trim(),
        number: input.number.trim(),
        complement: input.complement?.trim() || null,
        district: input.district.trim(),
        city: input.city.trim(),
        state: normalizeState(input.state),
      },
    });

    await tx.lawyerOab.create({
      data: {
        organizationId: organization.id,
        userId: context.userId,
        rawNumber: oab.rawNumber,
        normalizedNumber: oab.normalizedNumber,
        state: oab.uf,
        isPrimary: true,
      },
    });

    await tx.subscription.create({
      data: {
        organizationId: organization.id,
        planSlug: plan.slug,
        billingCycle: isFree ? "trial" : input.billingCycle,
        commercialPeriod: getCommercialPeriod(now),
        // A contagem comercial só começa depois que o e-mail é confirmado.
        status: "pending_verification",
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: null,
      },
    });

    await tx.legalAcceptance.createMany({
      data: [
        {
          userId: context.userId,
          organizationId: organization.id,
          documentType: "terms",
          documentVersion: LEGAL_DOCUMENT_VERSIONS.terms,
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null,
        },
        {
          userId: context.userId,
          organizationId: organization.id,
          documentType: "privacy",
          documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy,
          userAgent: context.userAgent ?? null,
          ipAddress: context.ipAddress ?? null,
        },
      ],
    });

    await tx.auditEvent.create({
      data: {
        organizationId: organization.id,
        actorUserId: context.userId,
        category: "onboarding",
        action: "organization.created",
        entityType: "organization",
        entityId: organization.id,
        metadata: {
          planSlug: plan.slug,
          subscriptionStatus: "pending_verification",
        },
      },
    });

    await tx.session.updateMany({
      where: { id: context.sessionId, userId: context.userId },
      data: { activeOrganizationId: organization.id },
    });

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      planSlug: plan.slug,
      alreadyCompleted: false,
    };
  });
}

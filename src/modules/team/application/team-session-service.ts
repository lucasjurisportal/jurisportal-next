import { prisma } from "@/infrastructure/database/prisma";

export type TeamSessionEndReason = "manual" | "inactivity" | "removed_by_owner";

export async function startTeamSession(input: {
  organizationId: string;
  userId: string;
  sessionId: string;
}) {
  const profile = await prisma.teamMemberProfile.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!profile) return { tracked: false as const };

  const existing = await prisma.auditEvent.findFirst({
    where: {
      organizationId: input.organizationId,
      actorUserId: input.userId,
      category: "team",
      action: "team.session.started",
      entityType: "auth_session",
      entityId: input.sessionId,
    },
    select: { id: true },
  });

  const now = new Date();
  await prisma.teamMemberProfile.updateMany({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
      status: "ACTIVE",
    },
    data: { lastActiveAt: now },
  });

  if (!existing) {
    await prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.userId,
        category: "team",
        action: "team.session.started",
        entityType: "auth_session",
        entityId: input.sessionId,
        metadata: { source: "app_shell" },
        createdAt: now,
      },
    });
  }

  return { tracked: true as const };
}

export async function endTeamSession(input: {
  organizationId: string;
  userId: string;
  sessionId: string;
  reason: TeamSessionEndReason;
}) {
  const profile = await prisma.teamMemberProfile.findFirst({
    where: {
      organizationId: input.organizationId,
      userId: input.userId,
    },
    select: { id: true },
  });
  if (!profile) return { tracked: false as const };

  const existing = await prisma.auditEvent.findFirst({
    where: {
      organizationId: input.organizationId,
      actorUserId: input.userId,
      category: "team",
      action: "team.session.ended",
      entityType: "auth_session",
      entityId: input.sessionId,
    },
    select: { id: true },
  });
  if (existing) return { tracked: true as const, duplicate: true as const };

  const now = new Date();
  await prisma.$transaction([
    prisma.teamMemberProfile.updateMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        status: "ACTIVE",
      },
      data: { lastActiveAt: now },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.userId,
        category: "team",
        action: "team.session.ended",
        entityType: "auth_session",
        entityId: input.sessionId,
        metadata: { reason: input.reason },
        createdAt: now,
      },
    }),
  ]);

  return { tracked: true as const, duplicate: false as const };
}

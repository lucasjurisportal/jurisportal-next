import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { createOab } from "@/modules/lawyers/domain/oab";
import type { PlanDefinition } from "@/modules/plans/domain/plan.types";
import type { z } from "zod";
import { normalizeTeamMobile, type createTeamMemberSchema, type editTeamContactSchema } from "../domain/team.schema";

export async function getTeamUsage(organizationId: string) {
  const [users, oabs] = await Promise.all([
    prisma.member.count({ where: { organizationId } }),
    prisma.lawyerOab.count({ where: { organizationId, isActive: true } }),
  ]);

  return { users, oabs };
}

export async function listTeamMembers(organizationId: string, canSeeContacts = false) {
  const members = await prisma.member.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          teamProfile: true,
          profile: { select: { phone: true } },
          lawyerOabs: {
            where: { organizationId, isActive: true },
            orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
            take: 1,
            select: { rawNumber: true, state: true },
          },
        },
      },
    },
  });

  return members.map((member) => {
    const primaryOab = member.user.lawyerOabs[0] ?? null;
    return {
      id: member.id,
      userId: member.userId,
      name: member.user.name,
      email: member.user.email,
      mobile: canSeeContacts ? (member.user.profile?.phone ?? "") : "",
      role: member.role,
      accessLevel:
        member.user.teamProfile?.accessLevel ??
        (member.role === "owner" ? "OWNER" : "LEVEL_1"),
      jobTitle:
        member.user.teamProfile?.jobTitle ??
        (member.role === "owner" ? "Proprietário" : null),
      status: member.user.teamProfile?.status ?? "ACTIVE",
      lastActiveAt: member.user.teamProfile?.lastActiveAt ?? null,
      oabState: member.user.teamProfile?.oabState ?? primaryOab?.state ?? null,
      oabNumber: member.user.teamProfile?.oabNumber ?? primaryOab?.rawNumber ?? null,
      createdAt: member.createdAt,
    };
  });
}

export async function createTeamMember(input: {
  organizationId: string;
  actorUserId: string;
  plan: PlanDefinition;
  data: z.infer<typeof createTeamMemberSchema>;
}) {
  const actorMembership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
      },
    },
  });
  if (actorMembership?.role !== "owner") throw new Error("TEAM_OWNER_REQUIRED");

  let oab: ReturnType<typeof createOab>;
  try {
    oab = createOab(input.data.oabNumber, input.data.oabState);
  } catch {
    throw new Error("TEAM_INVALID_OAB");
  }

  const [usage, existingUser, existingOab] = await Promise.all([
    getTeamUsage(input.organizationId),
    prisma.user.findUnique({ where: { email: input.data.email } }),
    prisma.lawyerOab.findUnique({
      where: {
        organizationId_normalizedNumber_state: {
          organizationId: input.organizationId,
          normalizedNumber: oab.normalizedNumber,
          state: oab.uf,
        },
      },
      select: { id: true },
    }),
  ]);

  if (usage.users >= input.plan.users) throw new Error("TEAM_PLAN_USER_LIMIT_REACHED");
  if (usage.oabs >= input.plan.oabs) throw new Error("TEAM_PLAN_OAB_LIMIT_REACHED");
  if (existingUser) throw new Error("TEAM_EMAIL_ALREADY_IN_USE");
  if (existingOab) throw new Error("TEAM_OAB_ALREADY_IN_USE");

  let createdUserId: string | null = null;
  try {
    const signup = await auth.api.signUpEmail({
      body: {
        name: input.data.name,
        email: input.data.email,
        password: input.data.provisionalPassword,
      },
    });
    const userId = signup.user.id;
    createdUserId = userId;

    await prisma.$transaction(
      async (tx) => {
        // Revalida as duas cotas dentro da transação para evitar ultrapassar
        // os limites comerciais por duas criações quase simultâneas.
        const [memberCount, oabCount, duplicateOab] = await Promise.all([
          tx.member.count({ where: { organizationId: input.organizationId } }),
          tx.lawyerOab.count({
            where: { organizationId: input.organizationId, isActive: true },
          }),
          tx.lawyerOab.findUnique({
            where: {
              organizationId_normalizedNumber_state: {
                organizationId: input.organizationId,
                normalizedNumber: oab.normalizedNumber,
                state: oab.uf,
              },
            },
            select: { id: true },
          }),
        ]);

        if (memberCount >= input.plan.users) {
          throw new Error("TEAM_PLAN_USER_LIMIT_REACHED");
        }
        if (oabCount >= input.plan.oabs) {
          throw new Error("TEAM_PLAN_OAB_LIMIT_REACHED");
        }
        if (duplicateOab) throw new Error("TEAM_OAB_ALREADY_IN_USE");

        await tx.user.update({
          where: { id: userId },
          data: { emailVerified: true },
        });
        if (input.data.mobile.trim()) {
          await tx.userProfile.create({
            data: { userId, phone: normalizeTeamMobile(input.data.mobile) },
          });
        }
        await tx.member.create({
          data: {
            organizationId: input.organizationId,
            userId,
            role: "member",
          },
        });
        await tx.teamMemberProfile.create({
          data: {
            organizationId: input.organizationId,
            userId,
            accessLevel: input.data.accessLevel,
            jobTitle: input.data.jobTitle || null,
            oabState: oab.uf,
            oabNumber: oab.rawNumber,
            mustChangePassword: true,
          },
        });
        await tx.lawyerOab.create({
          data: {
            organizationId: input.organizationId,
            userId,
            state: oab.uf,
            rawNumber: oab.rawNumber,
            normalizedNumber: oab.normalizedNumber,
            isPrimary: true,
            isActive: true,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.actorUserId,
            category: "team",
            action: "team.member.created",
            entityType: "user",
            entityId: userId,
            metadata: {
              email: input.data.email,
              accessLevel: input.data.accessLevel,
              jobTitle: input.data.jobTitle || null,
              oabState: oab.uf,
              oabNumber: oab.rawNumber,
            },
          },
        });
      },
      { isolationLevel: "Serializable" },
    );

    return { id: userId, email: input.data.email };
  } catch (error) {
    if (createdUserId) {
      await prisma.user.delete({ where: { id: createdUserId } }).catch(() => undefined);
    }
    throw error;
  }
}

/** Somente contatos podem ser alterados. OAB, nome, nível de acesso e histórico ficam intactos. */
export async function updateTeamMemberContact(input: {
  organizationId: string;
  actorUserId: string;
  userId: string;
  data: z.infer<typeof editTeamContactSchema>;
}) {
  const actor = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.actorUserId } },
    select: { role: true },
  });
  if (actor?.role !== "owner") throw new Error("TEAM_OWNER_REQUIRED");
  const target = await prisma.member.findUnique({
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
    include: { user: { select: { email: true, profile: { select: { phone: true } } } } },
  });
  if (!target) throw new Error("TEAM_MEMBER_NOT_FOUND");
  if (target.role === "owner") throw new Error("TEAM_OWNER_CONTACT_RESTRICTED");
  const mobile = normalizeTeamMobile(input.data.mobile);
  const emailChanged = target.user.email !== input.data.email;
  const mobileChanged = (target.user.profile?.phone ?? "") !== mobile;
  if (!emailChanged && !mobileChanged) return { emailChanged: false };
  if (emailChanged) {
    if (!process.env.RESEND_API_KEY) throw new Error("TEAM_EMAIL_DELIVERY_NOT_CONFIGURED");
    const inUse = await prisma.user.findUnique({ where: { email: input.data.email }, select: { id: true } });
    if (inUse && inUse.id !== input.userId) throw new Error("TEAM_EMAIL_ALREADY_IN_USE");
  }
  try {
    await prisma.$transaction(async (tx) => {
      if (emailChanged) {
        // Não declarar automaticamente que o novo e-mail pertence ao auxiliar.
        await tx.user.update({ where: { id: input.userId }, data: { email: input.data.email, emailVerified: false } });
        await tx.session.deleteMany({ where: { userId: input.userId } });
        await tx.trustedDevice.deleteMany({ where: { userId: input.userId } });
        await tx.authChallenge.deleteMany({ where: { userId: input.userId } });
      }
      if (mobileChanged) {
        if (mobile) {
          await tx.userProfile.upsert({
            where: { userId: input.userId }, create: { userId: input.userId, phone: mobile },
            update: { phone: mobile },
          });
        } else {
          await tx.userProfile.deleteMany({ where: { userId: input.userId } });
        }
      }
      await tx.auditEvent.create({
        data: { organizationId: input.organizationId, actorUserId: input.actorUserId,
          category: "team", action: "team.contact.updated", entityType: "user", entityId: input.userId,
          metadata: { emailChanged, mobileChanged },
        },
      });
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      throw new Error("TEAM_EMAIL_ALREADY_IN_USE");
    }
    throw error;
  }
  return { emailChanged };
}

export async function removeTeamMember(input: {
  organizationId: string;
  actorUserId: string;
  userId: string;
}) {
  const actor = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.actorUserId,
      },
    },
  });
  if (actor?.role !== "owner") throw new Error("TEAM_OWNER_REQUIRED");
  if (input.actorUserId === input.userId) throw new Error("TEAM_OWNER_CANNOT_REMOVE_SELF");

  const target = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
    },
    include: { user: { include: { teamProfile: true } } },
  });
  if (!target) throw new Error("TEAM_MEMBER_NOT_FOUND");
  if (target.role === "owner") throw new Error("TEAM_OWNER_CANNOT_BE_REMOVED");

  const activeSessions = await prisma.session.findMany({
    where: { userId: input.userId },
    select: { id: true },
  });

  await prisma.$transaction(async (tx) => {
    for (const session of activeSessions) {
      const alreadyEnded = await tx.auditEvent.findFirst({
        where: {
          organizationId: input.organizationId,
          actorUserId: input.userId,
          category: "team",
          action: "team.session.ended",
          entityType: "auth_session",
          entityId: session.id,
        },
        select: { id: true },
      });
      if (!alreadyEnded) {
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorUserId: input.userId,
            category: "team",
            action: "team.session.ended",
            entityType: "auth_session",
            entityId: session.id,
            metadata: { reason: "removed_by_owner" },
          },
        });
      }
    }

    await tx.session.deleteMany({ where: { userId: input.userId } });
    await tx.member.delete({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.userId,
        },
      },
    });
    await tx.teamMemberProfile.updateMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
      },
      data: {
        status: "REMOVED",
        removedAt: new Date(),
        removedByUserId: input.actorUserId,
      },
    });
    // A OAB deixa de consumir a cota e de ser monitorada, mas o registro permanece
    // para preservar vínculos históricos de publicações e auditoria.
    await tx.lawyerOab.updateMany({
      where: {
        organizationId: input.organizationId,
        userId: input.userId,
        isActive: true,
      },
      data: { isActive: false },
    });
    await tx.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        category: "team",
        action: "team.member.removed",
        entityType: "user",
        entityId: input.userId,
        metadata: {
          email: target.user.email,
          accessLevel: target.user.teamProfile?.accessLevel ?? null,
          oabState: target.user.teamProfile?.oabState ?? null,
          oabNumber: target.user.teamProfile?.oabNumber ?? null,
        },
      },
    });
  });
}

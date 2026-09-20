import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import {
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_SECONDS,
  OTP_TTL_MINUTES,
  type OtpDeliveryChannel,
  type SecurityChallengePurpose,
} from "../domain/security-policy";
import { generateOtpCode, hashOtpCode, normalizeOtpCode, otpMatches } from "../domain/otp";
import {
  createTrustedDeviceToken,
  hashTrustedDeviceToken,
  hashUserAgent,
} from "../domain/trusted-device";
import { sendOtpEmail } from "../infrastructure/email-otp-delivery";
import { sendOtpSms } from "../infrastructure/sms-otp-delivery";

export type RequestSecurityMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

type SendChallengeInput = {
  userId: string;
  sessionId: string;
  purpose: SecurityChallengePurpose;
  channel: OtpDeliveryChannel;
  email: string;
  phone?: string | null;
  meta?: RequestSecurityMeta;
};

export type SendChallengeResult =
  | { status: "sent"; retryAfterSeconds: number; destinationMasked: string }
  | { status: "cooldown"; retryAfterSeconds: number; destinationMasked: string };

export type VerifyChallengeResult =
  | { ok: true }
  | { ok: false; reason: "NOT_FOUND" | "EXPIRED" | "INVALID" | "BLOCKED"; attemptsRemaining: number };

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function addSeconds(date: Date, seconds: number) {
  return new Date(date.getTime() + seconds * 1000);
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "e-mail cadastrado";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(local.length - visible.length, 3))}@${domain}`;
}

function maskPhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  if (digits.length < 4) return "celular cadastrado";
  return `••••••${digits.slice(-4)}`;
}

export async function recordSecurityEvent(input: {
  userId?: string | null;
  sessionId?: string | null;
  type: string;
  success: boolean;
  meta?: RequestSecurityMeta;
  metadata?: Prisma.InputJsonValue;
}) {
  await prisma.securityEvent.create({
    data: {
      userId: input.userId ?? null,
      sessionId: input.sessionId ?? null,
      type: input.type,
      success: input.success,
      ipAddress: input.meta?.ipAddress ?? null,
      userAgent: input.meta?.userAgent ?? null,
      metadata: input.metadata ?? undefined,
    },
  });
}

export async function ensureUserSecurityProfile(userId: string) {
  return prisma.userSecurityProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function sendSecurityChallenge(input: SendChallengeInput): Promise<SendChallengeResult> {
  const now = new Date();
  const current = await prisma.authChallenge.findFirst({
    where: {
      userId: input.userId,
      sessionId: input.sessionId,
      purpose: input.purpose,
      consumedAt: null,
      blockedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  const destinationMasked = input.channel === "email" ? maskEmail(input.email) : maskPhone(input.phone);

  if (current && current.resendAvailableAt > now) {
    return {
      status: "cooldown",
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resendAvailableAt.getTime() - now.getTime()) / 1000),
      ),
      destinationMasked: current.destinationMasked || destinationMasked,
    };
  }

  if (current) {
    await prisma.authChallenge.update({
      where: { id: current.id },
      data: { consumedAt: now },
    });
  }

  const challengeId = randomUUID();
  const code = generateOtpCode();
  const expiresAt = addMinutes(now, OTP_TTL_MINUTES);
  const resendAvailableAt = addSeconds(now, OTP_RESEND_SECONDS);

  await prisma.authChallenge.create({
    data: {
      id: challengeId,
      userId: input.userId,
      sessionId: input.sessionId,
      purpose: input.purpose,
      channel: input.channel,
      codeHash: hashOtpCode(challengeId, input.purpose, code),
      destinationMasked,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
      resendAvailableAt,
    },
  });

  try {
    let deliveryId: string | null = null;
    if (input.channel === "email") {
      deliveryId = await sendOtpEmail({ to: input.email, code, purpose: input.purpose });
    } else {
      deliveryId = await sendOtpSms();
    }

    await prisma.authChallenge.update({
      where: { id: challengeId },
      data: { deliveryId },
    });

    await recordSecurityEvent({
      userId: input.userId,
      sessionId: input.sessionId,
      type: `otp.sent.${input.purpose.toLowerCase()}`,
      success: true,
      meta: input.meta,
      metadata: { channel: input.channel },
    });
  } catch (error) {
    await prisma.authChallenge.update({
      where: { id: challengeId },
      data: { consumedAt: new Date() },
    });
    await recordSecurityEvent({
      userId: input.userId,
      sessionId: input.sessionId,
      type: `otp.delivery_failed.${input.purpose.toLowerCase()}`,
      success: false,
      meta: input.meta,
      metadata: {
        channel: input.channel,
        reason: error instanceof Error ? error.message : "unknown",
      },
    });
    throw error;
  }

  return {
    status: "sent",
    retryAfterSeconds: OTP_RESEND_SECONDS,
    destinationMasked,
  };
}

export async function verifySecurityChallenge(input: {
  userId: string;
  sessionId: string;
  purpose: SecurityChallengePurpose;
  code: string;
  meta?: RequestSecurityMeta;
}): Promise<VerifyChallengeResult> {
  const now = new Date();
  const challenge = await prisma.authChallenge.findFirst({
    where: {
      userId: input.userId,
      sessionId: input.sessionId,
      purpose: input.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    return { ok: false, reason: "NOT_FOUND", attemptsRemaining: 0 };
  }

  if (challenge.blockedAt) {
    return { ok: false, reason: "BLOCKED", attemptsRemaining: 0 };
  }

  if (challenge.expiresAt <= now) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { consumedAt: now },
    });
    return { ok: false, reason: "EXPIRED", attemptsRemaining: 0 };
  }

  const normalized = normalizeOtpCode(input.code);
  const providedHash = hashOtpCode(challenge.id, input.purpose, normalized);
  const correct = normalized.length === 5 && otpMatches(challenge.codeHash, providedHash);

  if (!correct) {
    const attempts = challenge.attempts + 1;
    const blocked = attempts >= challenge.maxAttempts;

    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: {
        attempts,
        blockedAt: blocked ? now : null,
      },
    });

    if (blocked && input.purpose === "LOGIN_2FA") {
      await prisma.userSecurityProfile.upsert({
        where: { userId: input.userId },
        create: {
          userId: input.userId,
          recoveryRequired: true,
          twoFactorLockedAt: now,
        },
        update: {
          recoveryRequired: true,
          twoFactorLockedAt: now,
        },
      });
    }

    await recordSecurityEvent({
      userId: input.userId,
      sessionId: input.sessionId,
      type: `otp.invalid.${input.purpose.toLowerCase()}`,
      success: false,
      meta: input.meta,
      metadata: { attempts, blocked },
    });

    return {
      ok: false,
      reason: blocked ? "BLOCKED" : "INVALID",
      attemptsRemaining: Math.max(challenge.maxAttempts - attempts, 0),
    };
  }

  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: now },
  });

  await recordSecurityEvent({
    userId: input.userId,
    sessionId: input.sessionId,
    type: `otp.verified.${input.purpose.toLowerCase()}`,
    success: true,
    meta: input.meta,
  });

  return { ok: true };
}

export async function markSessionSecondFactorVerified(userId: string, sessionId: string) {
  await prisma.session.updateMany({
    where: { id: sessionId, userId },
    data: { secondFactorVerifiedAt: new Date() },
  });
}

export async function createTrustedDevice(input: {
  userId: string;
  userAgent?: string | null;
  meta?: RequestSecurityMeta;
  sessionId?: string | null;
}) {
  const token = createTrustedDeviceToken();
  await prisma.trustedDevice.create({
    data: {
      userId: input.userId,
      tokenHash: token.tokenHash,
      userAgentHash: hashUserAgent(input.userAgent),
      expiresAt: token.expiresAt,
    },
  });
  await recordSecurityEvent({
    userId: input.userId,
    sessionId: input.sessionId,
    type: "trusted_device.created",
    success: true,
    meta: input.meta,
    metadata: { expiresAt: token.expiresAt.toISOString() },
  });
  return token;
}

export async function validateTrustedDevice(input: {
  userId: string;
  rawToken?: string | null;
  userAgent?: string | null;
}) {
  if (!input.rawToken) return false;
  const tokenHash = hashTrustedDeviceToken(input.rawToken);
  const device = await prisma.trustedDevice.findUnique({ where: { tokenHash } });
  if (!device || device.userId !== input.userId || device.revokedAt || device.expiresAt <= new Date()) {
    return false;
  }
  const currentUaHash = hashUserAgent(input.userAgent);
  if (device.userAgentHash && currentUaHash && device.userAgentHash !== currentUaHash) {
    return false;
  }
  await prisma.trustedDevice.update({
    where: { id: device.id },
    data: { lastUsedAt: new Date() },
  });
  return true;
}

export async function verifyEmailForSession(userId: string, sessionId: string) {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { emailVerified: true } });
    await tx.session.updateMany({
      where: { id: sessionId, userId },
      data: { secondFactorVerifiedAt: now },
    });

    const memberships = await tx.member.findMany({
      where: { userId },
      select: { organizationId: true },
    });

    for (const membership of memberships) {
      const subscription = await tx.subscription.findUnique({
        where: { organizationId: membership.organizationId },
      });
      if (!subscription || subscription.status !== "pending_verification") continue;

      if (subscription.planSlug === "free") {
        const trialEnd = new Date(now);
        trialEnd.setUTCMonth(trialEnd.getUTCMonth() + 3);
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "trialing",
            startedAt: now,
            currentPeriodStart: now,
            currentPeriodEnd: trialEnd,
          },
        });
      } else {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "pending_payment",
            startedAt: now,
            currentPeriodStart: now,
          },
        });
      }
    }
  });
}

export async function clearRecoveryRequirement(userId: string) {
  await prisma.userSecurityProfile.upsert({
    where: { userId },
    create: {
      userId,
      recoveryRequired: false,
      twoFactorLockedAt: null,
      lastRecoveryAt: new Date(),
    },
    update: {
      recoveryRequired: false,
      twoFactorLockedAt: null,
      lastRecoveryAt: new Date(),
    },
  });
}

export async function getUserSecurityState(userId: string) {
  return prisma.userSecurityProfile.findUnique({ where: { userId } });
}

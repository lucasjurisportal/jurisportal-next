import { prisma } from "@/infrastructure/database/prisma";
import { validateTrustedDevice } from "./security-service";

export async function hasVerifiedSecondFactor(input: {
  userId: string;
  sessionId: string;
  trustedDeviceToken?: string | null;
  userAgent?: string | null;
}) {
  const session = await prisma.session.findFirst({
    where: { id: input.sessionId, userId: input.userId },
    select: { secondFactorVerifiedAt: true },
  });

  if (session?.secondFactorVerifiedAt) return true;

  const trusted = await validateTrustedDevice({
    userId: input.userId,
    rawToken: input.trustedDeviceToken,
    userAgent: input.userAgent,
  });

  if (!trusted) return false;

  await prisma.session.updateMany({
    where: { id: input.sessionId, userId: input.userId },
    data: { secondFactorVerifiedAt: new Date() },
  });
  return true;
}

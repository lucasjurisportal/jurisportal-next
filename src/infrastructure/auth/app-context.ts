import { cookies, headers } from "next/headers";
import { auth } from "@/infrastructure/auth/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getCurrentWorkspace } from "@/modules/organizations/application/get-current-workspace";
import { hasVerifiedSecondFactor } from "@/modules/security/application/session-guard";
import { getUserSecurityState } from "@/modules/security/application/security-service";
import { TRUSTED_DEVICE_COOKIE } from "@/modules/security/domain/security-policy";

export type AppContextFailure = "AUTH_REQUIRED" | "EMAIL_NOT_VERIFIED" | "RECOVERY_REQUIRED" | "SECOND_FACTOR_REQUIRED" | "WORKSPACE_REQUIRED";

export async function getAppContext() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session?.user || !session.session) return { ok: false as const, reason: "AUTH_REQUIRED" as AppContextFailure };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.emailVerified) return { ok: false as const, reason: "EMAIL_NOT_VERIFIED" as AppContextFailure };

  const securityState = await getUserSecurityState(session.user.id);
  if (securityState?.recoveryRequired) return { ok: false as const, reason: "RECOVERY_REQUIRED" as AppContextFailure };

  const cookieStore = await cookies();
  const secondFactorOk = await hasVerifiedSecondFactor({
    userId: session.user.id,
    sessionId: session.session.id,
    trustedDeviceToken: cookieStore.get(TRUSTED_DEVICE_COOKIE)?.value,
    userAgent: requestHeaders.get("user-agent"),
  });
  if (!secondFactorOk) return { ok: false as const, reason: "SECOND_FACTOR_REQUIRED" as AppContextFailure };

  const workspace = await getCurrentWorkspace(session.user.id, session.session.activeOrganizationId ?? null);
  if (!workspace) return { ok: false as const, reason: "WORKSPACE_REQUIRED" as AppContextFailure };

  return { ok: true as const, user: session.user, session: session.session, workspace };
}

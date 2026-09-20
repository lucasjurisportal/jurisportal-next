import { prisma } from "@/infrastructure/database/prisma";
import { encryptIntegrationSecret, decryptIntegrationSecret } from "../infrastructure/token-crypto";
import { revokeGoogleToken } from "../infrastructure/google-oauth";

export async function saveGoogleCalendarConnection(input: {
  organizationId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
}) {
  const existing = await prisma.googleCalendarConnection.findUnique({
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
  });
  const encryptedRefreshToken = input.refreshToken
    ? encryptIntegrationSecret(input.refreshToken)
    : existing?.encryptedRefreshToken ?? null;
  if (!encryptedRefreshToken) throw new Error("GOOGLE_CALENDAR_REFRESH_TOKEN_MISSING");

  const expiresAt = input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000) : null;
  return prisma.googleCalendarConnection.upsert({
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      encryptedAccessToken: encryptIntegrationSecret(input.accessToken),
      encryptedRefreshToken,
      accessTokenExpiresAt: expiresAt,
      scope: input.scope ?? null,
      status: "CONNECTED",
      connectedAt: new Date(),
      revokedAt: null,
    },
    update: {
      encryptedAccessToken: encryptIntegrationSecret(input.accessToken),
      encryptedRefreshToken,
      accessTokenExpiresAt: expiresAt,
      scope: input.scope ?? existing?.scope ?? null,
      status: "CONNECTED",
      connectedAt: new Date(),
      revokedAt: null,
    },
  });
}

export async function getGoogleCalendarConnectionStatus(organizationId: string, userId: string) {
  const [connection, errorCount] = await Promise.all([
    prisma.googleCalendarConnection.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
      select: { id: true, status: true, connectedAt: true, lastUsedAt: true, scope: true },
    }),
    prisma.externalCalendarEventLink.count({
      where: { organizationId, userId, provider: "GOOGLE", syncStatus: "ERROR" },
    }),
  ]);
  return {
    connected: connection?.status === "CONNECTED",
    connection,
    errorCount,
  };
}

export async function disconnectGoogleCalendar(input: { organizationId: string; userId: string }) {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
  });
  if (!connection) return;

  const token = connection.encryptedRefreshToken ?? connection.encryptedAccessToken;
  if (token) {
    try { await revokeGoogleToken(decryptIntegrationSecret(token)); } catch (error) { console.warn("[google-calendar.revoke]", error); }
  }

  await prisma.$transaction([
    prisma.googleCalendarConnection.update({
      where: { id: connection.id },
      data: {
        status: "DISCONNECTED",
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        accessTokenExpiresAt: null,
        revokedAt: new Date(),
      },
    }),
    prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.userId,
        category: "integrations",
        action: "google_calendar.disconnected",
        entityType: "google_calendar_connection",
        entityId: connection.id,
      },
    }),
  ]);
}

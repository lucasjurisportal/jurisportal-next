import { prisma } from "@/infrastructure/database/prisma";
import { decryptIntegrationSecret, encryptIntegrationSecret } from "./token-crypto";
import { refreshGoogleAccessToken } from "./google-oauth";
import type { GoogleCalendarEventPayload } from "../domain/google-event";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

async function getConnection(connectionId: string) {
  const connection = await prisma.googleCalendarConnection.findUnique({ where: { id: connectionId } });
  if (!connection || connection.status !== "CONNECTED") throw new Error("GOOGLE_CALENDAR_NOT_CONNECTED");
  return connection;
}

async function getValidAccessToken(connectionId: string) {
  const connection = await getConnection(connectionId);
  const nowPlusMargin = Date.now() + 60_000;
  if (connection.encryptedAccessToken && connection.accessTokenExpiresAt && connection.accessTokenExpiresAt.getTime() > nowPlusMargin) {
    return decryptIntegrationSecret(connection.encryptedAccessToken);
  }
  if (!connection.encryptedRefreshToken) throw new Error("GOOGLE_CALENDAR_REFRESH_TOKEN_MISSING");

  const refreshed = await refreshGoogleAccessToken(decryptIntegrationSecret(connection.encryptedRefreshToken));
  const expiresAt = refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000) : null;
  await prisma.googleCalendarConnection.update({
    where: { id: connection.id },
    data: {
      encryptedAccessToken: encryptIntegrationSecret(refreshed.access_token),
      accessTokenExpiresAt: expiresAt,
      scope: refreshed.scope ?? connection.scope,
      lastUsedAt: new Date(),
    },
  });
  return refreshed.access_token;
}

async function googleRequest(connectionId: string, path: string, init: RequestInit) {
  const token = await getValidAccessToken(connectionId);
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    const error = new Error(`GOOGLE_CALENDAR_API_FAILED:${response.status}:${details.slice(0, 300)}`);
    Object.assign(error, { status: response.status });
    throw error;
  }
  await prisma.googleCalendarConnection.update({ where: { id: connectionId }, data: { lastUsedAt: new Date() } });
  if (response.status === 204) return null;
  return response.json().catch(() => null);
}

export async function insertGoogleEvent(connectionId: string, calendarId: string, event: GoogleCalendarEventPayload) {
  const body = await googleRequest(connectionId, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(event),
  }) as { id?: string } | null;
  if (!body?.id) throw new Error("GOOGLE_CALENDAR_EVENT_ID_MISSING");
  return body.id;
}

export async function patchGoogleEvent(connectionId: string, calendarId: string, eventId: string, event: GoogleCalendarEventPayload) {
  await googleRequest(connectionId, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(event),
  });
}

export async function deleteGoogleEvent(connectionId: string, calendarId: string, eventId: string) {
  try {
    await googleRequest(connectionId, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("GOOGLE_CALENDAR_API_FAILED:404:")) return;
    throw error;
  }
}

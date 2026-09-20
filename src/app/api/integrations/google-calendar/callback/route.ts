import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { saveGoogleCalendarConnection } from "@/modules/integrations/google-calendar/application/google-calendar-connection-service";
import { exchangeGoogleAuthorizationCode } from "@/modules/integrations/google-calendar/infrastructure/google-oauth";

const STATE_COOKIE = "jp_google_calendar_oauth_state";
const baseUrl = () => process.env.BETTER_AUTH_URL || "http://localhost:3000";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const context = await getAppContext();
  if (!context.ok) return NextResponse.redirect(new URL("/login", baseUrl()));

  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const oauthError = url.searchParams.get("error");

  if (oauthError) return NextResponse.redirect(new URL(`/app/agenda?google=${encodeURIComponent(oauthError)}`, baseUrl()));
  if (!expectedState || !state || expectedState !== state || !code) {
    return NextResponse.redirect(new URL("/app/agenda?google=state_error", baseUrl()));
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code);
    const connection = await saveGoogleCalendarConnection({
      organizationId: context.workspace.organizationId,
      userId: context.user.id,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scope: tokens.scope,
    });
    await prisma.auditEvent.create({
      data: {
        organizationId: context.workspace.organizationId,
        actorUserId: context.user.id,
        category: "integrations",
        action: "google_calendar.connected",
        entityType: "google_calendar_connection",
        entityId: connection.id,
        metadata: { scope: tokens.scope ?? null },
      },
    });
    const response = NextResponse.redirect(new URL("/app/agenda?google=connected", baseUrl()));
    response.cookies.set(STATE_COOKIE, "", { maxAge: 0, path: "/api/integrations/google-calendar" });
    return response;
  } catch (error) {
    console.error("[google-calendar.callback]", error);
    return NextResponse.redirect(new URL("/app/agenda?google=connection_failed", baseUrl()));
  }
}

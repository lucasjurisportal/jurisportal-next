import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { buildGoogleAuthorizationUrl } from "@/modules/integrations/google-calendar/infrastructure/google-oauth";

const STATE_COOKIE = "jp_google_calendar_oauth_state";

export async function GET() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.redirect(new URL("/login", process.env.BETTER_AUTH_URL || "http://localhost:3000"));

  try {
    if (!process.env.GOOGLE_CALENDAR_TOKEN_KEY?.trim()) throw new Error("GOOGLE_CALENDAR_TOKEN_KEY_MISSING");
    const state = randomBytes(32).toString("base64url");
    const response = NextResponse.redirect(buildGoogleAuthorizationUrl(state));
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 10 * 60,
      path: "/api/integrations/google-calendar",
    });
    return response;
  } catch (error) {
    console.error("[google-calendar.connect]", error);
    return NextResponse.redirect(new URL("/app/agenda?google=config_error", process.env.BETTER_AUTH_URL || "http://localhost:3000"));
  }
}

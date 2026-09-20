import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { syncUpcomingForUser } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  try {
    const result = await syncUpcomingForUser({ organizationId: context.workspace.organizationId, userId: context.user.id });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GOOGLE_CALENDAR_SYNC_FAILED";
    if (message === "GOOGLE_CALENDAR_NOT_CONNECTED") return NextResponse.json({ error: message }, { status: 409 });
    console.error("[google-calendar.sync]", error);
    return NextResponse.json({ error: "GOOGLE_CALENDAR_SYNC_FAILED" }, { status: 500 });
  }
}

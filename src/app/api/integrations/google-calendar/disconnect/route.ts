import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { disconnectGoogleCalendar } from "@/modules/integrations/google-calendar/application/google-calendar-connection-service";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  try {
    await disconnectGoogleCalendar({ organizationId: context.workspace.organizationId, userId: context.user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[google-calendar.disconnect]", error);
    return NextResponse.json({ error: "GOOGLE_CALENDAR_DISCONNECT_FAILED" }, { status: 500 });
  }
}

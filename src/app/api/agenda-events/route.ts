import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { createAgendaEvent } from "@/modules/agenda/application/agenda-service";
import { agendaEventSchema } from "@/modules/agenda/domain/agenda-event.schema";
import { syncAgendaEventToGoogleCalendar } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const body = await request.json().catch(() => null);
  const parsed = agendaEventSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_AGENDA_EVENT", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  try {
    const event = await createAgendaEvent({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, data: parsed.data });
    try { await syncAgendaEventToGoogleCalendar({ organizationId: context.workspace.organizationId, agendaEventId: event.id }); } catch (error) { console.warn("[google-calendar.agenda-event.create]", error); }
    return NextResponse.json({ ok: true, id: event.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AGENDA_EVENT_CREATE_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PROCESS_RESPONSIBLE_INVALID") return NextResponse.json({ error: message }, { status: 422 });
    console.error("[agenda.create]", error);
    return NextResponse.json({ error: "AGENDA_EVENT_CREATE_FAILED" }, { status: 500 });
  }
}

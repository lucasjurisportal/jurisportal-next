import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { createProcessWorkItem } from "@/modules/processes/application/process-workspace-service";
import { processWorkItemSchema } from "@/modules/processes/domain/process-workspace.schema";
import { syncWorkItemToGoogleCalendar } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = processWorkItemSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_WORK_ITEM", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    const item = await createProcessWorkItem({
      organizationId: context.workspace.organizationId,
      processId: id,
      actorUserId: context.user.id,
      data: parsed.data,
    });
    try { await syncWorkItemToGoogleCalendar({ organizationId: context.workspace.organizationId, workItemId: item.id }); } catch (error) { console.warn("[google-calendar.process-work-item.create]", error); }
    return NextResponse.json({ ok: true, id: item.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WORK_ITEM_CREATE_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PROCESS_RESPONSIBLE_INVALID") return NextResponse.json({ error: message }, { status: 422 });
    console.error("[processes.work-items.create]", error);
    return NextResponse.json({ error: "WORK_ITEM_CREATE_FAILED" }, { status: 500 });
  }
}

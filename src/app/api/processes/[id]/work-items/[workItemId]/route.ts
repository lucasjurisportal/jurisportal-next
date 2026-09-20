import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { changeProcessWorkItemStatus } from "@/modules/processes/application/process-workspace-service";
import { workItemStatusSchema } from "@/modules/processes/domain/process-workspace.schema";
import { syncWorkItemToGoogleCalendar } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; workItemId: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id, workItemId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = workItemStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_WORK_ITEM_STATUS" }, { status: 422 });

  try {
    await changeProcessWorkItemStatus({
      organizationId: context.workspace.organizationId,
      processId: id,
      workItemId,
      actorUserId: context.user.id,
      status: parsed.data.status,
    });
    try { await syncWorkItemToGoogleCalendar({ organizationId: context.workspace.organizationId, workItemId }); } catch (error) { console.warn("[google-calendar.process-work-item.status]", error); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WORK_ITEM_UPDATE_FAILED";
    if (message === "WORK_ITEM_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    console.error("[processes.work-items.update]", error);
    return NextResponse.json({ error: "WORK_ITEM_UPDATE_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { changeGlobalWorkItemStatus, updateTask } from "@/modules/work-items/application/work-item-service";
import { globalWorkItemStatusSchema, taskEditSchema } from "@/modules/work-items/domain/work-item.schema";
import { syncWorkItemToGoogleCalendar } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = globalWorkItemStatusSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_WORK_ITEM_STATUS" }, { status: 422 });
  try {
    await changeGlobalWorkItemStatus({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, workItemId: id, status: parsed.data.status });
    try { await syncWorkItemToGoogleCalendar({ organizationId: context.workspace.organizationId, workItemId: id }); } catch (error) { console.warn("[google-calendar.work-item.status]", error); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "WORK_ITEM_UPDATE_FAILED";
    if (message === "WORK_ITEM_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    console.error("[work-items.status]", error);
    return NextResponse.json({ error: "WORK_ITEM_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = taskEditSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_TASK", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  try {
    await updateTask({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, workItemId: id, data: parsed.data });
    try { await syncWorkItemToGoogleCalendar({ organizationId: context.workspace.organizationId, workItemId: id }); } catch (error) { console.warn("[google-calendar.work-item.update]", error); }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TASK_UPDATE_FAILED";
    if (message === "WORK_ITEM_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "DEADLINE_EDIT_REQUIRES_AUDITED_FLOW") return NextResponse.json({ error: message }, { status: 409 });
    if (message === "PROCESS_RESPONSIBLE_INVALID") return NextResponse.json({ error: message }, { status: 422 });
    console.error("[work-items.update]", error);
    return NextResponse.json({ error: "TASK_UPDATE_FAILED" }, { status: 500 });
  }
}

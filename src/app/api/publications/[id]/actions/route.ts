import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { publicationActionSchema } from "@/modules/publications/domain/publication.schema";
import {
  confirmPublicationDeadline,
  createTaskFromPublication,
  dismissPublicationDeadlineReview,
  linkPublicationToProcess,
  markPublicationTreated,
} from "@/modules/publications/application/publication-service";
import { syncWorkItemToGoogleCalendar } from "@/modules/integrations/google-calendar/application/calendar-sync-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = publicationActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PUBLICATION_ACTION", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  try {
    if (parsed.data.action === "mark-treated") {
      await markPublicationTreated({ organizationId: context.workspace.organizationId, publicationId: id, actorUserId: context.user.id });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "link-process") {
      await linkPublicationToProcess({
        organizationId: context.workspace.organizationId,
        publicationId: id,
        processId: parsed.data.processId,
        actorUserId: context.user.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "dismiss-deadline") {
      await dismissPublicationDeadlineReview({ organizationId: context.workspace.organizationId, publicationId: id, actorUserId: context.user.id });
      return NextResponse.json({ ok: true });
    }

    if (parsed.data.action === "confirm-deadline") {
      const item = await confirmPublicationDeadline({
        organizationId: context.workspace.organizationId,
        publicationId: id,
        actorUserId: context.user.id,
        title: parsed.data.title,
        dueDate: parsed.data.dueDate,
      });
      try {
        await syncWorkItemToGoogleCalendar({ organizationId: context.workspace.organizationId, workItemId: item.id });
      } catch (error) {
        console.warn("[google-calendar.publication-deadline]", error);
      }
      return NextResponse.json({ ok: true, workItemId: item.id });
    }

    const item = await createTaskFromPublication({
      organizationId: context.workspace.organizationId,
      publicationId: id,
      actorUserId: context.user.id,
      title: parsed.data.title,
      dueDate: parsed.data.dueDate || undefined,
      responsibleUserId: parsed.data.responsibleUserId || undefined,
    });
    if (item.dueDate) {
      try {
        await syncWorkItemToGoogleCalendar({ organizationId: context.workspace.organizationId, workItemId: item.id });
      } catch (error) {
        console.warn("[google-calendar.publication-task]", error);
      }
    }
    return NextResponse.json({ ok: true, workItemId: item.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PUBLICATION_ACTION_FAILED";
    const status = message === "PUBLICATION_NOT_FOUND" || message === "PROCESS_NOT_FOUND" ? 404
      : message === "PUBLICATION_PROCESS_REQUIRED" || message === "DEADLINE_REVIEW_ALREADY_RESOLVED" || message === "PROCESS_RESPONSIBLE_INVALID" ? 422
      : message === "PUBLICATION_PROCESS_CNJ_MISMATCH" ? 409
      : 500;
    if (status === 500) console.error("[publication.action]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

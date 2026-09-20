import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { changeProcessStatus, deleteProcessPermanently, getProcess, updateProcess } from "@/modules/processes/application/process-service";
import { processUpdateInputSchema } from "@/modules/processes/domain/process.schema";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const process = await getProcess(context.workspace.organizationId, id);
  if (!process) return NextResponse.json({ error: "PROCESS_NOT_FOUND" }, { status: 404 });
  return NextResponse.json(process);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = processUpdateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PROCESS", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  try {
    const canCorrectCnj = context.workspace.organizationSlug === "jurisportal-internal" && await isPlatformMaster(context.user.id);
    const { cnjCorrectionReason, ...data } = parsed.data;
    const process = await updateProcess({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      processId: id,
      data,
      allowCnjChange: canCorrectCnj,
      cnjCorrectionReason,
    });
    return NextResponse.json({ ok: true, process });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROCESS_UPDATE_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PROCESS_DUPLICATE_CNJ") return NextResponse.json({ error: message }, { status: 409 });
    if (message === "PROCESS_CNJ_LOCKED") return NextResponse.json({ error: message }, { status: 403 });
    if (message === "PROCESS_CNJ_CHANGE_REASON_REQUIRED") return NextResponse.json({ error: message }, { status: 422 });
    if (message === "PROCESS_CLIENT_INVALID" || message === "PROCESS_RESPONSIBLE_INVALID") {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[processes.update]", error);
    return NextResponse.json({ error: "PROCESS_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const status = typeof body === "object" && body !== null && "status" in body ? String((body as { status?: unknown }).status) : "";
  if (!status) return NextResponse.json({ error: "PROCESS_STATUS_INVALID" }, { status: 422 });

  try {
    const process = await changeProcessStatus({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      processId: id,
      status,
    });
    return NextResponse.json({ ok: true, process });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROCESS_UPDATE_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PROCESS_STATUS_INVALID") return NextResponse.json({ error: message }, { status: 422 });
    console.error("[processes.status]", error);
    return NextResponse.json({ error: "PROCESS_UPDATE_FAILED" }, { status: 500 });
  }
}


export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;

  try {
    await deleteProcessPermanently({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      processId: id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROCESS_DELETE_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PROCESS_DELETE_FORBIDDEN") return NextResponse.json({ error: message }, { status: 403 });
    console.error("[processes.delete]", error);
    return NextResponse.json({ error: "PROCESS_DELETE_FAILED" }, { status: 500 });
  }
}

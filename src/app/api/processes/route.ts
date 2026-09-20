import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { createProcess, listProcesses } from "@/modules/processes/application/process-service";
import { processCreateInputSchema } from "@/modules/processes/domain/process.schema";

export async function GET(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const url = new URL(request.url);
  const page = Number(url.searchParams.get("page") || "1");
  const status = url.searchParams.get("status");

  const result = await listProcesses({
    organizationId: context.workspace.organizationId,
    page: Number.isFinite(page) ? page : 1,
    query: url.searchParams.get("q") || undefined,
    status:
      status === "ACTIVE" || status === "CLOSED" || status === "ARCHIVED" || status === "FOUND"
        ? status
        : undefined,
    responsibleUserId: url.searchParams.get("responsibleUserId") || undefined,
  });

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const parsed = processCreateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "INVALID_PROCESS", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  try {
    const { confirmCnj: _confirmCnj, ...data } = parsed.data;
    const process = await createProcess({
      organizationId: context.workspace.organizationId,
      actorUserId: context.user.id,
      processLimit: context.workspace.plan.registeredProcessLimit,
      data,
    });
    return NextResponse.json({ ok: true, process }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PROCESS_CREATE_FAILED";
    if (message === "PROCESS_LIMIT_REACHED" || message === "PROCESS_DUPLICATE_CNJ") {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    if (message === "PROCESS_CLIENT_INVALID" || message === "PROCESS_RESPONSIBLE_INVALID") {
      return NextResponse.json({ error: message }, { status: 422 });
    }
    console.error("[processes.create]", error);
    return NextResponse.json({ error: "PROCESS_CREATE_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { isProcessLookupEnabled } from "@/modules/integrations/process-metadata/infrastructure/datajud-client";
import { syncExistingProcessMovements, ProcessLookupError } from "@/modules/integrations/process-metadata/application/sync-process-movements";

/** Segunda fase do botão DJeN, isolada: uma falha externa nunca desfaz as publicações. */
export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (context.workspace.role !== "owner") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  if (!isProcessLookupEnabled()) return NextResponse.json({ error: "PROCESS_LOOKUP_DISABLED" }, { status: 503 });
  const input = await request.json().catch(() => null) as { processId?: unknown } | null;
  if (typeof input?.processId !== "string" || !/^[0-9a-f-]{36}$/i.test(input.processId))
    return NextResponse.json({ error: "INVALID_PROCESS_ID" }, { status: 422 });
  try {
    const result = await syncExistingProcessMovements({ organizationId: context.workspace.organizationId,
      actorUserId: context.user.id, processId: input.processId });
    return NextResponse.json({ result }, { headers: { "cache-control": "no-store" } });
  } catch (cause) {
    const code = cause instanceof ProcessLookupError ? cause.code
      : cause instanceof Error && cause.message === "PROCESS_NOT_FOUND" ? "PROCESS_NOT_FOUND" : "MOVEMENT_SYNC_FAILED";
    console.warn("[process.movements.sync]", { code, upstreamStatus: cause instanceof ProcessLookupError ? cause.upstreamStatus : undefined });
    const status = code === "PROCESS_NOT_FOUND" ? 404 : code === "PROCESS_LOOKUP_RATE_LIMIT" ? 429 : 503;
    return NextResponse.json({ error: code }, { status });
  }
}

import { NextResponse } from "next/server";
import { listSavedProcessMovements } from "@/modules/integrations/process-metadata/application/sync-process-movements";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { getProcess } from "@/modules/processes/application/process-service";
import { isProcessLookupEnabled } from "@/modules/integrations/process-metadata/infrastructure/datajud-client";
import { syncExistingProcessMovements, ProcessLookupError } from "@/modules/integrations/process-metadata/application/sync-process-movements";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const process = await getProcess(context.workspace.organizationId, id);
  if (!process) return NextResponse.json({ error: "PROCESS_NOT_FOUND" }, { status: 404 });
  if (!isProcessLookupEnabled()) return NextResponse.json({ error: "PROCESS_LOOKUP_DISABLED" }, { status: 503 });
  try {
    const result = await syncExistingProcessMovements({ organizationId: context.workspace.organizationId,
      processId: id, actorUserId: context.user.id });
    const items = await listSavedProcessMovements(context.workspace.organizationId, id);
    return NextResponse.json({ items, newMovements: result.newMovements, truncated: result.truncated },
      { headers: { "cache-control": "private, no-store" } });
  } catch (cause) {
    const code = cause instanceof ProcessLookupError ? cause.code : "MOVEMENT_SYNC_FAILED";
    console.warn("[process.movements.lookup]", { code });
    return NextResponse.json({ error: code }, { status: code === "PROCESS_LOOKUP_RATE_LIMIT" ? 429 : 503 });
  }
}

/** Leitura não produz efeitos nem depende da disponibilidade do provedor. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const process = await getProcess(context.workspace.organizationId, id);
  if (!process) return NextResponse.json({ error: "PROCESS_NOT_FOUND" }, { status: 404 });
  const items = await listSavedProcessMovements(context.workspace.organizationId, id);
  return NextResponse.json({ items }, { headers: { "cache-control": "private, no-store" } });
}

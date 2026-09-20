import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { createProcessFinanceEntry } from "@/modules/processes/application/process-workspace-service";
import { financeEntrySchema } from "@/modules/processes/domain/process-workspace.schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = financeEntrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FINANCE_ENTRY", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    const entry = await createProcessFinanceEntry({
      organizationId: context.workspace.organizationId,
      processId: id,
      actorUserId: context.user.id,
      data: parsed.data,
    });
    return NextResponse.json({ ok: true, id: entry.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FINANCE_ENTRY_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    console.error("[processes.finance.entries]", error);
    return NextResponse.json({ error: "FINANCE_ENTRY_FAILED" }, { status: 500 });
  }
}

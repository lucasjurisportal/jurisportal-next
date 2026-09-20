import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { upsertProcessFeeAgreement } from "@/modules/processes/application/process-workspace-service";
import { feeAgreementSchema } from "@/modules/processes/domain/process-workspace.schema";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = feeAgreementSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FEE_AGREEMENT", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    await upsertProcessFeeAgreement({
      organizationId: context.workspace.organizationId,
      processId: id,
      actorUserId: context.user.id,
      data: parsed.data,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "FEE_AGREEMENT_FAILED";
    if (message === "PROCESS_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "CASE_VALUE_REQUIRED" || message === "FEE_AMOUNT_REQUIRED") return NextResponse.json({ error: message }, { status: 422 });
    console.error("[processes.finance.agreement]", error);
    return NextResponse.json({ error: "FEE_AGREEMENT_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { DocumentError, listProcessDocuments, startPdfUpload } from "@/modules/documents/application/document-service";

export const runtime = "nodejs";
const denied = () => NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
const fail = (error: unknown) => {
  if (error instanceof DocumentError) return NextResponse.json({ error: error.code }, { status: error.httpStatus });
  console.error("[documents]", error);
  return NextResponse.json({ error: "DOCUMENT_OPERATION_FAILED" }, { status: 500 });
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return denied();
  try {
    const { id } = await params;
    return NextResponse.json(await listProcessDocuments({
      organizationId: context.workspace.organizationId, processId: id,
      planGb: context.workspace.plan.storageLimitGb,
    }));
  } catch (error) { return fail(error); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return denied();
  try {
    const { id } = await params;
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") throw new DocumentError("INVALID_DOCUMENT");
    const value = body as Record<string, unknown>;
    if (typeof value.name !== "string" || typeof value.sizeBytes !== "number") throw new DocumentError("INVALID_DOCUMENT");
    const result = await startPdfUpload({
      organizationId: context.workspace.organizationId, userId: context.user.id,
      processId: id, planGb: context.workspace.plan.storageLimitGb,
      name: value.name, sizeBytes: value.sizeBytes,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) { return fail(error); }
}

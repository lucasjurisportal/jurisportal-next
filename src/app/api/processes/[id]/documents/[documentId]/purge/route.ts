import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { DocumentError, permanentlyDeleteDocument } from "@/modules/documents/application/document-service";

export const runtime = "nodejs";
export async function POST(_: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (context.workspace.role !== "owner") return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  const { id, documentId } = await params;
  try {
    return NextResponse.json(await permanentlyDeleteDocument({
      organizationId: context.workspace.organizationId, processId: id, documentId, userId: context.user.id,
    }));
  } catch (error) {
    if (error instanceof DocumentError) return NextResponse.json({ error: error.code }, { status: error.httpStatus });
    console.error("[documents.purge]", error);
    return NextResponse.json({ error: "DOCUMENT_OPERATION_FAILED" }, { status: 500 });
  }
}

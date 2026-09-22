import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { DocumentError, finishPdfUpload } from "@/modules/documents/application/document-service";
export const runtime = "nodejs";
export async function POST(_: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id, documentId } = await params;
  try {
    return NextResponse.json(await finishPdfUpload({
      organizationId: context.workspace.organizationId, userId: context.user.id,
      processId: id, documentId,
    }));
  } catch (error) {
    if (error instanceof DocumentError) return NextResponse.json({ error: error.code }, { status: error.httpStatus });
    console.error("[documents.complete]", error);
    return NextResponse.json({ error: "DOCUMENT_COMPLETION_FAILED" }, { status: 500 });
  }
}

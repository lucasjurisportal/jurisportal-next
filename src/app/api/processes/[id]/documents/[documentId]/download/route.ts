import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { DocumentError, downloadPdf } from "@/modules/documents/application/document-service";
export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const { id, documentId } = await params;
  try {
    return NextResponse.json(await downloadPdf({ organizationId: context.workspace.organizationId, processId: id, documentId, userId: context.user.id }), {
      headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    });
  } catch (error) {
    if (error instanceof DocumentError) return NextResponse.json({ error: error.code }, { status: error.httpStatus });
    console.error("[documents.download]", error);
    return NextResponse.json({ error: "DOCUMENT_DOWNLOAD_FAILED" }, { status: 500 });
  }
}

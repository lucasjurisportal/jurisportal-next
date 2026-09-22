import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { backupPendingDocuments } from "@/modules/documents/application/document-backup-service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expected = process.env.CRON_SECRET ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  try {
    return NextResponse.json(await backupPendingDocuments(1));
  } catch (error) {
    console.error("[documents.backup.cron]", error instanceof Error ? error.message : "FAILED");
    return NextResponse.json({ error: "DOCUMENT_BACKUP_FAILED" }, { status: 500 });
  }
}

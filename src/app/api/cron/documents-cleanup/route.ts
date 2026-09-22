import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { cleanupDocuments } from "@/modules/documents/application/document-service";
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
    return NextResponse.json(await cleanupDocuments());
  } catch (error) {
    console.error("[documents.cleanup]", error);
    return NextResponse.json({ error: "CLEANUP_FAILED" }, { status: 500 });
  }
}

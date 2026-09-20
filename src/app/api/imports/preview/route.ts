import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { previewImport, type ImportMapping } from "@/modules/imports/application/import-service";
import type { ImportKind } from "@/modules/imports/domain/import-definition";

export const runtime = "nodejs";

function parseKind(value: FormDataEntryValue | null): ImportKind | null {
  return value === "clients" || value === "processes" ? value : null;
}

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (context.workspace.role !== "owner") return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = parseKind(form.get("kind"));
    if (!(file instanceof File) || !kind) return NextResponse.json({ error: "INVALID_IMPORT_REQUEST" }, { status: 400 });
    let mapping: ImportMapping | undefined;
    const rawMapping = form.get("mapping");
    if (typeof rawMapping === "string" && rawMapping.trim()) mapping = JSON.parse(rawMapping) as ImportMapping;
    const preview = await previewImport({ organizationId: context.workspace.organizationId, plan: context.workspace.plan, kind, file, mapping });
    return NextResponse.json({ ok: true, preview });
  } catch (error) {
    const message = error instanceof Error ? error.message : "IMPORT_PREVIEW_FAILED";
    console.error("[imports.preview]", error);
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

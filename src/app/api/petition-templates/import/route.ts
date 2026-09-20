import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { importTemplateText } from "@/modules/petition-templates/infrastructure/imported-template-text";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });

  let form: FormData;
  try { form = await request.formData(); } catch { return NextResponse.json({ error: "INVALID_MULTIPART" }, { status: 400 }); }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "TEMPLATE_FILE_REQUIRED" }, { status: 422 });

  try {
    const imported = importTemplateText({ fileName: file.name, bytes: Buffer.from(await file.arrayBuffer()) });
    return NextResponse.json({ ok: true, ...imported });
  } catch (error) {
    const code = error instanceof Error ? error.message : "TEMPLATE_IMPORT_FAILED";
    const known = ["UNSUPPORTED_TEMPLATE_FILE","TXT_TOO_LARGE","DOCX_TOO_LARGE","DOCX_INVALID_ZIP","DOCX_CONTENT_TOO_LARGE","DOCX_UNSUPPORTED_COMPRESSION","DOCX_DOCUMENT_XML_NOT_FOUND","IMPORTED_TEMPLATE_EMPTY"];
    if (known.includes(code)) return NextResponse.json({ error: code }, { status: 422 });
    console.error("[petition-templates.import]", error);
    return NextResponse.json({ error: "TEMPLATE_IMPORT_FAILED" }, { status: 500 });
  }
}

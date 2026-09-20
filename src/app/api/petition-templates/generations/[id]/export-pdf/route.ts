import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { exportPetitionGeneration } from "@/modules/petition-templates/application/petition-template-service";
import { createPetitionPdf } from "@/modules/petition-templates/infrastructure/petition-pdf";

export const runtime = "nodejs";
const schema = z.object({ content: z.string().trim().min(1).max(180000) });

function safeName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 90) || "documento";
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FINAL_CONTENT" }, { status: 422 });
  const { id } = await params;
  try {
    const hash = createHash("sha256").update(parsed.data.content, "utf8").digest("hex");
    const generation = await exportPetitionGeneration({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, generationId: id, content: parsed.data.content, contentHash: hash });
    const pdf = createPetitionPdf(parsed.data.content);
    const pdfBody = Uint8Array.from(pdf);
    return new Response(pdfBody, { status: 200, headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${safeName(generation.templateName)}.pdf"`, "cache-control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PETITION_PDF_EXPORT_FAILED";
    if (code === "PETITION_GENERATION_NOT_FOUND") return NextResponse.json({ error: code }, { status: 404 });
    console.error("[petition-generation.export-pdf]", error);
    return NextResponse.json({ error: "PETITION_PDF_EXPORT_FAILED" }, { status: 500 });
  }
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/database/prisma";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { DocumentError, finishPdfUpload, startPdfUpload } from "@/modules/documents/application/document-service";
import { exportPetitionGeneration } from "@/modules/petition-templates/application/petition-template-service";
import { createPetitionPdf } from "@/modules/petition-templates/infrastructure/petition-pdf";

export const runtime = "nodejs";
const schema = z.object({ content: z.string().trim().min(1).max(180000) });
function safePdfName(name: string) {
  return (name.replace(/\.pdf$/i, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "peticao") + ".pdf";
}

/** Documento gerado no servidor: não depende de URL pública nem expõe credenciais R2 ao navegador. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) {
    return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FINAL_CONTENT" }, { status: 422 });
  const { id } = await params;
  try {
    const generation = await prisma.petitionGeneration.findFirst({
      where: { id, organizationId: context.workspace.organizationId },
      select: { id: true, processId: true, templateName: true },
    });
    if (!generation) return NextResponse.json({ error: "PETITION_GENERATION_NOT_FOUND" }, { status: 404 });
    if (!generation.processId) return NextResponse.json({ error: "PETITION_PROCESS_REQUIRED" }, { status: 422 });
    const pdf = createPetitionPdf(parsed.data.content);
    const pdfName = safePdfName(generation.templateName);
    const initiated = await startPdfUpload({
      organizationId: context.workspace.organizationId,
      processId: generation.processId,
      userId: context.user.id,
      planGb: context.workspace.plan.storageLimitGb,
      name: pdfName,
      sizeBytes: pdf.byteLength,
      source: "PETITION",
    });
    const uploaded = await fetch(initiated.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/pdf", "If-None-Match": "*" },
      body: new Uint8Array(pdf).buffer as ArrayBuffer,
      cache: "no-store",
    });
    if (!uploaded.ok) {
      console.error("[petition.save.r2]", { status: uploaded.status, generationId: generation.id });
      // A reserva PENDING será recuperada pelo cleanup se o envio falhar.
      throw new DocumentError("PETITION_STORAGE_FAILED", 502);
    }
    await finishPdfUpload({
      organizationId: context.workspace.organizationId, processId: generation.processId,
      documentId: initiated.id, userId: context.user.id,
    });
    await exportPetitionGeneration({
      organizationId: context.workspace.organizationId, actorUserId: context.user.id,
      generationId: generation.id, content: parsed.data.content,
      contentHash: createHash("sha256").update(parsed.data.content, "utf8").digest("hex"),
    });
    return NextResponse.json({ ok: true, processId: generation.processId, documentId: initiated.id }, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentError) return NextResponse.json({ error: error.code }, { status: error.httpStatus });
    console.error("[petition.save-in-process]", error);
    return NextResponse.json({ error: "PETITION_SAVE_FAILED" }, { status: 500 });
  }
}

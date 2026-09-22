import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/database/prisma";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { createPetitionPdf } from "@/modules/petition-templates/infrastructure/petition-pdf";
import { decodeRichDocument, richToPlain } from "@/modules/petition-templates/domain/rich-document";

export const runtime = "nodejs";
const schema = z.object({ content: z.string().trim().min(1).max(180000) });
/** Prévia não altera finalContent, nem conta uma exportação. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FINAL_CONTENT" }, { status: 422 });
  const { id } = await params;
  const exists = await prisma.petitionGeneration.findFirst({ where: { id, organizationId: context.workspace.organizationId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "PETITION_GENERATION_NOT_FOUND" }, { status: 404 });
  try {
    if (!richToPlain(decodeRichDocument(parsed.data.content)).trim()) return NextResponse.json({ error: "INVALID_FINAL_CONTENT" }, { status: 422 });
    const pdf = createPetitionPdf(parsed.data.content);
    return new Response(Uint8Array.from(pdf), { status: 200, headers: { "content-type": "application/pdf", "content-disposition": "inline; filename=previa-peticao.pdf", "cache-control": "no-store, private", "x-content-type-options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "INVALID_FINAL_CONTENT" }, { status: 422 });
  }
}

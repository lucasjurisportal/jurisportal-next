import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { savePetitionGenerationFinalContent } from "@/modules/petition-templates/application/petition-template-service";

const schema = z.object({ content: z.string().trim().min(1).max(180000) });

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_FINAL_CONTENT" }, { status: 422 });
  const { id } = await params;
  try {
    const generation = await savePetitionGenerationFinalContent({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, generationId: id, content: parsed.data.content });
    return NextResponse.json({ ok: true, generation });
  } catch (error) {
    const code = error instanceof Error ? error.message : "PETITION_GENERATION_UPDATE_FAILED";
    if (code === "PETITION_GENERATION_NOT_FOUND") return NextResponse.json({ error: code }, { status: 404 });
    console.error("[petition-generation.update]", error);
    return NextResponse.json({ error: "PETITION_GENERATION_UPDATE_FAILED" }, { status: 500 });
  }
}

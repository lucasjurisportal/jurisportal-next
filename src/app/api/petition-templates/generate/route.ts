import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { generatePetitionDraft } from "@/modules/petition-templates/application/petition-template-service";
import { petitionDraftInputSchema } from "@/modules/petition-templates/domain/petition-template.schema";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = petitionDraftInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PETITION_DRAFT", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    const result = await generatePetitionDraft({
      organizationId: context.workspace.organizationId,
      organizationName: context.workspace.organizationName,
      actorUserId: context.user.id,
      ...parsed.data,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PETITION_DRAFT_FAILED";
    if (["PETITION_TEMPLATE_NOT_FOUND", "PROCESS_NOT_FOUND", "CLIENT_NOT_FOUND"].includes(message)) return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PETITION_CLIENT_NOT_LINKED_TO_PROCESS") return NextResponse.json({ error: message }, { status: 409 });
    console.error("[petition-templates.generate]", error);
    return NextResponse.json({ error: "PETITION_DRAFT_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { createPetitionTemplate } from "@/modules/petition-templates/application/petition-template-service";
import { petitionTemplateInputSchema } from "@/modules/petition-templates/domain/petition-template.schema";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) {
    return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  }

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = petitionTemplateInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PETITION_TEMPLATE", fields: parsed.error.flatten().fieldErrors }, { status: 422 });

  try {
    const template = await createPetitionTemplate({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, data: parsed.data });
    return NextResponse.json({ ok: true, template }, { status: 201 });
  } catch (error) {
    console.error("[petition-templates.create]", error);
    return NextResponse.json({ error: "PETITION_TEMPLATE_CREATE_FAILED" }, { status: 500 });
  }
}

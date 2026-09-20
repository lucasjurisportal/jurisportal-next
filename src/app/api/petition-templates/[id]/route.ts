import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
import { petitionTemplateInputSchema } from "@/modules/petition-templates/domain/petition-template.schema";
import { setPetitionTemplateArchived, updatePetitionTemplate } from "@/modules/petition-templates/application/petition-template-service";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const parsed = petitionTemplateInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PETITION_TEMPLATE", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  try {
    const template = await updatePetitionTemplate({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, templateId: id, data: parsed.data });
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PETITION_TEMPLATE_UPDATE_FAILED";
    if (message === "PETITION_TEMPLATE_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    if (message === "PETITION_TEMPLATE_ARCHIVED") return NextResponse.json({ error: message }, { status: 409 });
    console.error("[petition-templates.update]", error);
    return NextResponse.json({ error: "PETITION_TEMPLATE_UPDATE_FAILED" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const { id } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 }); }
  const archived = typeof body === "object" && body !== null && "archived" in body ? Boolean((body as { archived?: unknown }).archived) : null;
  if (archived === null) return NextResponse.json({ error: "INVALID_ARCHIVE_STATE" }, { status: 422 });
  try {
    const template = await setPetitionTemplateArchived({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, templateId: id, archived });
    return NextResponse.json({ ok: true, template });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PETITION_TEMPLATE_UPDATE_FAILED";
    if (message === "PETITION_TEMPLATE_NOT_FOUND") return NextResponse.json({ error: message }, { status: 404 });
    console.error("[petition-templates.archive]", error);
    return NextResponse.json({ error: "PETITION_TEMPLATE_UPDATE_FAILED" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { officeSettingsSchema } from "@/modules/settings/domain/settings.schema";
import { updateOfficeSettings } from "@/modules/settings/application/settings-service";

export async function PATCH(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  if (context.workspace.role !== "owner") return NextResponse.json({ error: "OWNER_REQUIRED" }, { status: 403 });
  const parsed = officeSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_SETTINGS", fields: parsed.error.flatten().fieldErrors }, { status: 422 });
  await updateOfficeSettings({ organizationId: context.workspace.organizationId, actorUserId: context.user.id, data: parsed.data });
  return NextResponse.json({ ok: true });
}

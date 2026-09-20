import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { auth } from "@/infrastructure/auth/auth";
import { passwordChangeSchema } from "@/modules/settings/domain/settings.schema";
import { prisma } from "@/infrastructure/database/prisma";

export async function POST(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const parsed = passwordChangeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PASSWORD" }, { status: 422 });
  try {
    await auth.api.changePassword({ headers: request.headers, body: { currentPassword: parsed.data.currentPassword, newPassword: parsed.data.newPassword, revokeOtherSessions: true } });
    await prisma.auditEvent.create({ data: { organizationId: context.workspace.organizationId, actorUserId: context.user.id, category: "settings", action: "settings.password.changed", entityType: "user", entityId: context.user.id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "CURRENT_PASSWORD_INVALID" }, { status: 400 });
  }
}

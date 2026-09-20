import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";

export async function DELETE() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  const result = await prisma.session.deleteMany({ where: { userId: context.user.id, NOT: { id: context.session.id } } });
  await prisma.auditEvent.create({ data: { organizationId: context.workspace.organizationId, actorUserId: context.user.id, category: "settings", action: "settings.sessions.revoked", entityType: "user", entityId: context.user.id, metadata: { revoked: result.count } } });
  return NextResponse.json({ ok: true, revoked: result.count });
}

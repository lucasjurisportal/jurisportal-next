import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });
  await prisma.teamMemberProfile.updateMany({ where: { organizationId: context.workspace.organizationId, userId: context.user.id, status: "ACTIVE" }, data: { lastActiveAt: new Date() } });
  return NextResponse.json({ ok: true });
}

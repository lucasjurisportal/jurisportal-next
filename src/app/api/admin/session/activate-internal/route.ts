import { NextResponse } from "next/server";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { prisma } from "@/infrastructure/database/prisma";
import { isPlatformMaster } from "@/modules/security/application/platform-admin";
import { recordSecurityEvent } from "@/modules/security/application/security-service";

export async function POST() {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: context.reason }, { status: 401 });

  const master = await isPlatformMaster(context.user.id);
  if (!master) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const internal = await prisma.organization.findUnique({
    where: { slug: "jurisportal-internal" },
    select: { id: true },
  });
  if (!internal) return NextResponse.json({ error: "INTERNAL_ORGANIZATION_NOT_FOUND" }, { status: 404 });

  const membership = await prisma.member.findUnique({
    where: {
      organizationId_userId: {
        organizationId: internal.id,
        userId: context.user.id,
      },
    },
    select: { id: true },
  });
  if (!membership) return NextResponse.json({ error: "INTERNAL_MEMBERSHIP_NOT_FOUND" }, { status: 403 });

  await prisma.session.update({
    where: { id: context.session.id },
    data: { activeOrganizationId: internal.id },
  });

  await recordSecurityEvent({
    userId: context.user.id,
    sessionId: context.session.id,
    type: "platform_admin.internal_workspace_activated",
    success: true,
    metadata: { organizationId: internal.id },
  });

  return NextResponse.json({ ok: true, organizationId: internal.id });
}

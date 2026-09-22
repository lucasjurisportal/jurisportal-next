import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/infrastructure/database/prisma";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
/** Carrega processos vinculados ao cliente, mesmo quando não estão entre os 250 recentes. */
export async function GET(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const clientId = new URL(request.url).searchParams.get("clientId") ?? "";
  if (!z.string().uuid().safeParse(clientId).success) return NextResponse.json({ error: "INVALID_CLIENT" }, { status: 422 });
  const processes = await prisma.process.findMany({
    where: { organizationId: context.workspace.organizationId, status: { not: "ARCHIVED" }, clients: { some: { clientId, client: { organizationId: context.workspace.organizationId, status: "ACTIVE" } } } },
    orderBy: { updatedAt: "desc" }, take: 250,
    select: {
      id: true, internalCode: true, cnjFormatted: true, subject: true,
      clients: { orderBy: { isPrimary: "desc" }, select: { client: { select: { id: true, name: true, tradeName: true } } } },
    },
  });
  return NextResponse.json({ processes }, { headers: { "cache-control": "no-store" } });
}

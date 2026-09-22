import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { getAppContext } from "@/infrastructure/auth/app-context";
import { hasCapability } from "@/modules/plans/application/plan-entitlements";
export async function GET(request: Request) {
  const context = await getAppContext();
  if (!context.ok) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  if (!hasCapability(context.workspace.plan, "petitionTemplates.basic")) return NextResponse.json({ error: "PETITION_TEMPLATES_NOT_AVAILABLE_FOR_PLAN" }, { status: 403 });
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (q.length < 2) return NextResponse.json({ clients: [] });
  const clients = await prisma.client.findMany({
    where: { organizationId: context.workspace.organizationId, status: "ACTIVE", OR: [
      { name: { contains: q, mode: "insensitive" } },
      { tradeName: { contains: q, mode: "insensitive" } },
      { taxIdNormalized: { contains: q.replace(/\D/g, "") || "__NO_MATCH__" } },
    ] },
    orderBy: { name: "asc" }, take: 20,
    select: { id: true, name: true, tradeName: true, taxIdRaw: true },
  });
  return NextResponse.json({ clients }, { headers: { "cache-control": "no-store" } });
}

import { prisma } from "@/infrastructure/database/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() AS now`;

    return Response.json({
      status: "ok",
      database: "connected",
      checkedAt: rows[0]?.now?.toISOString() ?? new Date().toISOString(),
    });
  } catch (error) {
    console.error("[database-health] Falha ao consultar PostgreSQL", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
        message: "O Jurisportal não conseguiu consultar o PostgreSQL.",
      },
      { status: 503 },
    );
  }
}

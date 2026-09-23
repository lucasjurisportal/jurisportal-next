import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { syncOrganizationDjen } from "@/modules/publications/application/djen-capture-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Precisa ser homologado no provedor; não pressupor que o plano suporta esta duração.
export const maxDuration = 300;

/**
 * Entrada protegida para um agendador externo. DESLIGADA até homologação do ambiente brasileiro.
 * Processa um escritório por execução: evita varrer a base inteira em uma requisição serverless.
 * Prioriza o escritório com a tentativa mais antiga, inclusive aqueles sem cursor.
 */
export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET ?? "";
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  if (process.env.DJEN_CAPTURE_ENABLED !== "true") {
    return NextResponse.json({ error: "DJEN_CAPTURE_NOT_HOMOLOGATED" }, { status: 503 });
  }
  try {
    // Buscar o escritório menos recentemente consultado, não revelar identificadores em logs.
    // O serviço valida novamente plano/capability e limites de OAB no servidor.
    const candidates = await prisma.$queryRaw<Array<{ organizationId: string }>>`
      SELECT l."organizationId" AS "organizationId"
      FROM "lawyer_oab" l
      JOIN "subscription" s ON s."organizationId" = l."organizationId"
      LEFT JOIN "djen_capture_cursor" c ON c."lawyerOabId" = l."id"
      WHERE l."isActive" = TRUE AND s."planSlug" <> 'free'
        AND (c."lastAttemptAt" IS NULL OR c."lastAttemptAt" < NOW() - INTERVAL '3 hours')
      GROUP BY l."organizationId"
      ORDER BY MIN(COALESCE(c."lastAttemptAt", TIMESTAMP '1970-01-01')) ASC
      LIMIT 1
    `;
    if (!candidates.length) return NextResponse.json({ ok: true, organizationsChecked: 0 });
    const result = await syncOrganizationDjen({ organizationId: candidates[0].organizationId });
    if (result.errors.length) {
      console.warn("[djen.cron] captura parcial", { failedOabs: result.errors.length });
      return NextResponse.json({ ok: false, failedOabs: result.errors.length,
        oabsChecked: result.oabsChecked, reviewCandidates: result.reviewCandidates }, { status: 503 });
    }
    return NextResponse.json({ ok: true, organizationsChecked: 1,
      oabsChecked: result.oabsChecked, newPublications: result.newPublications,
      reviewCandidates: result.reviewCandidates, skippedOabs: result.skippedOabs });
  } catch (error) {
    console.error("[djen.cron]", error instanceof Error ? error.message : "FAILED");
    return NextResponse.json({ error: "DJEN_CAPTURE_FAILED" }, { status: 500 });
  }
}

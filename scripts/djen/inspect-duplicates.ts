/** Auditoria somente leitura. Não descarta comunicados nem funde publicações por CNJ. */
import { prisma } from "@/infrastructure/database/prisma";

async function main() {
  const duplicateIds = await prisma.$queryRaw<Array<{ groups: bigint; extraRows: bigint }>>`
    SELECT COUNT(*)::bigint AS "groups",
      COALESCE(SUM(count_rows - 1), 0)::bigint AS "extraRows"
    FROM (
      SELECT COUNT(*)::bigint AS count_rows
      FROM publication
      WHERE "externalId" IS NOT NULL
      GROUP BY "organizationId", source, "externalId"
      HAVING COUNT(*) > 1
    ) duplicate_groups
  `;
  const staleReview = await prisma.$queryRaw<Array<{ total: bigint }>>`
    SELECT COUNT(DISTINCT c.id)::bigint AS total
    FROM djen_review_candidate c
    JOIN publication_recipient r ON r."organizationId" = c."organizationId"
      AND r."lawyerOabId" = c."lawyerOabId"
    JOIN publication p ON p.id = r."publicationId"
      AND p."organizationId" = c."organizationId"
      AND p.source = c.source AND p."externalKey" = c."externalKey"
    WHERE c.status = 'PENDING'
  `;
  console.log(JSON.stringify({
    duplicateCommunicationIdentityGroups: Number(duplicateIds[0]?.groups ?? 0),
    surplusRowsWithSameSourceIdentity: Number(duplicateIds[0]?.extraRows ?? 0),
    pendingReviewAlreadyConfirmedForSameOab: Number(staleReview[0]?.total ?? 0),
    note: "Apenas diagnostico. CNJ repetido nao prova publicacao duplicada.",
  }, null, 2));
}
main().catch((err) => {
  console.error("DJEN_DUPLICATE_AUDIT_FAILED", err instanceof Error ? err.message : "UNKNOWN");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());

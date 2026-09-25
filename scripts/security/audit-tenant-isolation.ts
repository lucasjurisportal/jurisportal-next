/**
 * Auditoria SOMENTE LEITURA, em staging, com duas organizações fictícias.
 * Não envia dados, credenciais, CNJs ou nomes ao terminal.
 * Não substitui testes HTTP com duas sessões nem comprova RLS isoladamente.
 */
import assert from "node:assert/strict";
import { config } from "dotenv";

config({ path: ".env.local" });

type RecordId = { id: string } | null;
type Lookup = (organizationId: string, recordId?: string) => Promise<RecordId>;

async function main() {
  if (process.env.JURISPORTAL_SECURITY_TEST !== "staging") {
    throw new Error("SECURITY_TEST_REQUIRES_STAGING_CONFIRMATION");
  }
  const [orgA, orgB] = process.argv.slice(2);
  if (!orgA || !orgB || orgA === orgB || !process.env.DATABASE_URL) {
    throw new Error("INFORM_TWO_DIFFERENT_TEST_ORGANIZATIONS_AND_DATABASE_URL");
  }

  // Importação após carregar .env.local: prisma.ts cria o pool durante o import.
  const { prisma } = await import("../../src/infrastructure/database/prisma");
  try {
    const organizations = await prisma.organization.count({ where: { id: { in: [orgA, orgB] } } });
    assert.equal(organizations, 2, "TEST_ORGANIZATION_NOT_FOUND");

    const cases: { label: string; find: Lookup; required?: boolean }[] = [
      { label: "processos", required: true, find: (org, id) => prisma.process.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "clientes", find: (org, id) => prisma.client.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "publicações", find: (org, id) => prisma.publication.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "documentos", find: (org, id) => prisma.processDocument.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "movimentações", find: (org, id) => prisma.processExternalMovement.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "prazos e tarefas", find: (org, id) => prisma.processWorkItem.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "lançamentos financeiros", find: (org, id) => prisma.processFinanceEntry.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "OABs", find: (org, id) => prisma.lawyerOab.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
      { label: "modelos de petição", find: (org, id) => prisma.petitionTemplate.findFirst({ where: { organizationId: org, ...(id ? { id } : {}) }, select: { id: true } }) },
    ];

    let verified = 0;
    let missing = 0;
    for (const item of cases) {
      const first = await item.find(orgA);
      const second = await item.find(orgB);
      if ((!first || !second) && item.required) throw new Error("TEST_FIXTURES_REQUIRED_FOR_PROCESSES");
      if (!first || !second) {
        missing++;
        console.log(`${item.label}: SEM AMOSTRAS NOS DOIS ESCRITÓRIOS; TESTE PENDENTE`);
        continue;
      }
      assert.equal(await item.find(orgB, first.id), null, "CROSS_TENANT_RESULT");
      assert.equal(await item.find(orgA, second.id), null, "CROSS_TENANT_RESULT");
      assert.ok(await item.find(orgA, first.id));
      assert.ok(await item.find(orgB, second.id));
      verified++;
      console.log(`${item.label}: filtros A→B e B→A aprovados (somente leitura)`);
    }

    // Verificação das funções utilizadas pelas rotas, não apenas do Prisma isolado.
    const [{ getProcess }, { getProcessWorkspaceData }, { getClient },
      { getPublicationDetail }, { listProcessDocuments }] = await Promise.all([
        import("../../src/modules/processes/application/process-service"),
        import("../../src/modules/processes/application/process-workspace-service"),
        import("../../src/modules/clients/application/client-service"),
        import("../../src/modules/publications/application/publication-service"),
        import("../../src/modules/documents/application/document-service"),
      ]);
    for (const [own, foreign] of [[orgA, orgB], [orgB, orgA]]) {
      const process = await prisma.process.findFirst({ where: { organizationId: own }, select: { id: true } });
      assert.ok(process, "TEST_FIXTURES_REQUIRED_FOR_PROCESSES");
      assert.equal(await getProcess(foreign, process.id), null, "PROCESS_SERVICE_CROSS_TENANT");
      await assert.rejects(
        getProcessWorkspaceData(foreign, process.id),
        /PROCESS_NOT_FOUND/,
        "PROCESS_WORKSPACE_CROSS_TENANT",
      );
      await assert.rejects(
        listProcessDocuments({ organizationId: foreign, processId: process.id, planGb: 10 }),
        (error: unknown) => error instanceof Error && error.message === "PROCESS_NOT_FOUND",
        "DOCUMENT_LIST_CROSS_TENANT",
      );
      const client = await prisma.client.findFirst({ where: { organizationId: own }, select: { id: true } });
      if (client) assert.equal(await getClient(foreign, client.id), null, "CLIENT_SERVICE_CROSS_TENANT");
      const publication = await prisma.publication.findFirst({ where: { organizationId: own }, select: { id: true } });
      if (publication) assert.equal(await getPublicationDetail(foreign, publication.id), null, "PUBLICATION_SERVICE_CROSS_TENANT");
    }
    console.log("Serviços reais de processos, workspace e documentos: acessos cruzados recusados nos dois sentidos");

    // Relações com FKs independentes podem, em caso de bug, apontar para outro tenant.
    // Audita sem alterar dados e sem imprimir IDs, CNJs ou nomes.
    const inconsistent = await prisma.$queryRaw<{ relation: string; invalid: number }[]>`
      SELECT 'process_client' AS relation, count(*)::int AS invalid
      FROM "process_client" pc JOIN "process" p ON p.id = pc."processId"
      JOIN "client" c ON c.id = pc."clientId"
      WHERE pc."organizationId" <> p."organizationId" OR pc."organizationId" <> c."organizationId"
      UNION ALL
      SELECT 'process_document', count(*)::int FROM "process_document" d
      JOIN "process" p ON p.id = d."processId"
      WHERE d."organizationId" <> p."organizationId"
      UNION ALL
      SELECT 'publication_process', count(*)::int FROM "publication" u
      JOIN "process" p ON p.id = u."processId"
      WHERE u."organizationId" <> p."organizationId"
      UNION ALL
      SELECT 'publication_recipient', count(*)::int FROM "publication_recipient" r
      JOIN "publication" u ON u.id = r."publicationId"
      JOIN "lawyer_oab" l ON l.id = r."lawyerOabId"
      WHERE r."organizationId" <> u."organizationId" OR r."organizationId" <> l."organizationId"
      UNION ALL
      SELECT 'process_work_item', count(*)::int FROM "process_work_item" w
      JOIN "process" p ON p.id = w."processId"
      WHERE w."organizationId" <> p."organizationId"
      UNION ALL
      SELECT 'deadline_review', count(*)::int FROM "deadline_review" r
      JOIN "publication" u ON u.id = r."publicationId"
      WHERE r."organizationId" <> u."organizationId"
    `;
    inconsistent.forEach((row) => console.log(`Vínculo ${row.relation}: ${row.invalid} inconsistências`));
    assert.ok(inconsistent.every((row) => row.invalid === 0), "CROSS_TENANT_RELATION_DETECTED");

    const policyRows = await prisma.$queryRaw<{
      table_name: string; enabled: boolean; forced: boolean; policies: bigint;
    }[]>`
      SELECT c.relname AS table_name, c.relrowsecurity AS enabled,
             c.relforcerowsecurity AS forced, count(p.policyname)::bigint AS policies
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_policies p ON p.schemaname = n.nspname AND p.tablename = c.relname
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      GROUP BY c.relname, c.relrowsecurity, c.relforcerowsecurity
    `;
    const protectedTables = policyRows.filter((item) => item.enabled);
    const withoutPolicy = protectedTables.filter((item) => Number(item.policies) === 0);
    const role = await prisma.$queryRaw<{ role_name: string; bypass: boolean; superuser: boolean }[]>`
      SELECT rolname AS role_name, rolbypassrls AS bypass, rolsuper AS superuser
      FROM pg_roles WHERE rolname = current_user
    `;
    console.log(`RLS: ${protectedTables.length}/${policyRows.length} tabelas habilitadas; ${withoutPolicy.length} habilitadas sem políticas`);
    console.log(`Conexão da aplicação contorna RLS: ${role[0]?.bypass || role[0]?.superuser ? "SIM" : "verificar proprietário de tabelas / FORCE RLS"}`);
    console.log(`RESULTADO: ${verified} grupos verificados; ${missing} grupos sem amostras. HTTP e acesso direto ao R2 permanecem pendentes.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Auditoria interrompida:", error instanceof Error ? error.message : "FAILED");
  process.exitCode = 1;
});

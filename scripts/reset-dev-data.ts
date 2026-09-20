import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  const authUrl = process.env.BETTER_AUTH_URL ?? "";
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");
  if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(authUrl)) {
    throw new Error("RESET BLOQUEADO: este comando só pode rodar com BETTER_AUTH_URL local.");
  }

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
  try {
    const masters = await prisma.platformAdmin.findMany({ where: { active: true }, select: { userId: true } });
    const masterIds = masters.map((item) => item.userId);

    await prisma.$transaction(async (tx) => {
      // Links externos são apagados antes das entidades locais; a conexão OAuth do mestre é preservada.
      // Eventos já enviados ao Google não são removidos por este reset local.
      await tx.externalCalendarEventLink.deleteMany();

      // Dados de negócio podem ser apagados inclusive do ambiente interno.
      // Compromissos sem processo precisam ser removidos explicitamente.
      await tx.agendaEvent.deleteMany();
      // Publicações também são dados de negócio e podem existir no ambiente interno de testes.
      // Destinatários e revisões de prazo são removidos em cascata.
      await tx.publication.deleteMany();
      // Processos vêm primeiro porque seus vínculos com clientes usam RESTRICT.
      await tx.process.deleteMany();
      // Reinicia a referência interna anual no ambiente de desenvolvimento.
      await tx.processNumberSequence.deleteMany();
      await tx.client.deleteMany();

      // Organizações de teste são removidas; o escritório interno é preservado.
      await tx.organization.deleteMany({ where: { slug: { not: "jurisportal-internal" } } });

      // Usuários de teste são removidos; administradores mestres são preservados.
      if (masterIds.length > 0) {
        await tx.user.deleteMany({ where: { id: { notIn: masterIds } } });
      }

      await tx.verification.deleteMany();

      // Depois de remover escritórios de teste, sessões antigas do mestre não podem
      // continuar apontando para uma organizationId que já não existe.
      if (masterIds.length > 0) {
        const internalOrg = await tx.organization.findUnique({
          where: { slug: "jurisportal-internal" },
          select: { id: true },
        });
        if (internalOrg) {
          await tx.session.updateMany({
            where: { userId: { in: masterIds } },
            data: { activeOrganizationId: internalOrg.id },
          });
        }
      }
    });

    console.log("Dados de desenvolvimento limpos.");
    console.log("PLATFORM_MASTER e Jurisportal Internal foram preservados.");
    console.log("Sessões do administrador foram reposicionadas no Jurisportal Internal.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});

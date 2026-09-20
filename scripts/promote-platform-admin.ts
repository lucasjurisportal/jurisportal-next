import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

loadEnv({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL não configurada.");

  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Uso: npm run admin:promote -- seu@email.com");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error("Usuário não encontrado. Crie a conta normalmente primeiro.");
    }
    if (!user.emailVerified) {
      throw new Error("Confirme o e-mail da conta antes de promovê-la.");
    }

    const internalOrg = await prisma.organization.upsert({
      where: { slug: "jurisportal-internal" },
      create: { name: "Jurisportal Internal", slug: "jurisportal-internal" },
      update: { name: "Jurisportal Internal" },
    });

    await prisma.member.upsert({
      where: {
        organizationId_userId: {
          organizationId: internalOrg.id,
          userId: user.id,
        },
      },
      create: {
        organizationId: internalOrg.id,
        userId: user.id,
        role: "owner",
      },
      update: { role: "owner" },
    });

    await prisma.subscription.upsert({
      where: { organizationId: internalOrg.id },
      create: {
        organizationId: internalOrg.id,
        planSlug: "alta-corte",
        billingCycle: "internal",
        commercialPeriod: "standard",
        status: "internal",
        startedAt: new Date(),
        currentPeriodStart: new Date(),
      },
      update: {
        planSlug: "alta-corte",
        billingCycle: "internal",
        status: "internal",
      },
    });

    await prisma.platformAdmin.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        role: "PLATFORM_MASTER",
        active: true,
      },
      update: {
        role: "PLATFORM_MASTER",
        active: true,
      },
    });

    await prisma.session.updateMany({
      where: { userId: user.id },
      data: { activeOrganizationId: internalOrg.id },
    });

    await prisma.securityEvent.create({
      data: {
        userId: user.id,
        type: "platform_admin.promoted",
        success: true,
        metadata: { organizationId: internalOrg.id },
      },
    });

    console.log(`Conta ${email} promovida para PLATFORM_MASTER.`);
    console.log("Escritório interno: Jurisportal Internal.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Erro ao promover administrador: ${message}`);
  process.exitCode = 1;
});

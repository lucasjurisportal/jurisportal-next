import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { issueMigrationCode, promotionCodeHash } from "../../src/modules/promotions/infrastructure/promotion-code";
config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  if (process.env.JURISPORTAL_COMMERCIAL_ADMIN !== "staging" || process.env.NODE_ENV === "production") throw new Error("SOMENTE_STAGING: exporte JURISPORTAL_COMMERCIAL_ADMIN=staging temporariamente.");
  const [organizationId, masterEmail, expiry, legacyConfirmed, apply] = process.argv.slice(2);
  if (!/^[a-f0-9-]{36}$/i.test(organizationId ?? "") || !masterEmail || !/^\d{4}-\d{2}-\d{2}$/.test(expiry ?? "") || legacyConfirmed !== "--legacy-verified" || apply !== "--apply")
    throw new Error("Uso: npm run promo:issue:migration -- ID_ORG EMAIL_MASTER AAAA-MM-DD --legacy-verified --apply");
  const expiresAt = new Date(`${expiry}T23:59:59-03:00`);
  if (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date()) throw new Error("INVALID_EXPIRY");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  const prisma = new PrismaClient({ adapter: new PrismaPg({connectionString: process.env.DATABASE_URL}) });
  try {
    const master = await prisma.user.findUnique({ where: { email: masterEmail.toLowerCase() }, include: { platformAdmin: true } });
    if (!master?.platformAdmin?.active) throw new Error("MASTER_NOT_AUTHORIZED");
    const org = await prisma.organization.findUnique({ where: { id: organizationId }, include: { subscription: true } });
    if (!org || org.slug === "jurisportal-internal" || org.subscription?.status === "active") throw new Error("ORG_NOT_ELIGIBLE");
    const code = issueMigrationCode();
    await prisma.$transaction(async (tx) => {
      await tx.promotionCode.create({ data: { organizationId, codeHash: promotionCodeHash(code), expiresAt } });
      await tx.auditEvent.create({ data: { organizationId, actorUserId: master.id, category: "billing", action: "migration_coupon.issued", entityType: "organization", entityId: organizationId,
        metadata: { campaign: "LEGACY_MIGRATION", percent: 20, expiresAt: expiresAt.toISOString(), legacyVerifiedManually: true } } });
    });
    console.log("Cupom de uso único (copie agora, não fica salvo em texto):",code);
    console.log("Vinculado somente ao escritório indicado. Preview não o consome.");
  } finally { await prisma.$disconnect(); }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "FAILED"); process.exitCode = 1; });

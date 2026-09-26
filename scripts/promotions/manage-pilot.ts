import { config } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { planCatalog } from "../../src/modules/plans/domain/plan.catalog";
config({ path: [".env.local", ".env"], quiet: true });
async function main() {
  if (process.env.JURISPORTAL_COMMERCIAL_ADMIN !== "staging" || process.env.NODE_ENV === "production") throw new Error("SOMENTE_STAGING");
  const [action, orgId, masterEmail, slug, days, confirm] = process.argv.slice(2);
  if (!["grant", "revoke"].includes(action ?? "") || !/^[a-f0-9-]{36}$/i.test(orgId ?? "") || !masterEmail || confirm !== "--apply") throw new Error("Uso: npm run pilot:manage -- grant ID_ORG EMAIL_MASTER premium 30 --apply | revoke ID_ORG EMAIL_MASTER - - --apply");
  if (action === "grant" && (!planCatalog.some((plan) => plan.slug === slug && plan.slug !== "free") || !/^\d+$/.test(days ?? "") || Number(days)<1 || Number(days)>90)) throw new Error("INVALID_PILOT_PLAN_OR_DAYS");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL_NOT_CONFIGURED");
  const prisma = new PrismaClient({adapter: new PrismaPg({ connectionString:process.env.DATABASE_URL })});
  try {
    const master = await prisma.user.findUnique({where:{email:masterEmail.toLowerCase()},include:{platformAdmin:true}});
    if (!master?.platformAdmin?.active) throw new Error("MASTER_NOT_AUTHORIZED");
    const org = await prisma.organization.findUnique({ where:{id:orgId},include:{subscription:true} });
    if (!org || org.slug === "jurisportal-internal" || ["active","internal"].includes(org.subscription?.status ?? "")) throw new Error("ORG_NOT_ELIGIBLE");
    const ends = new Date(Date.now() + Number(days || 0)*86400_000);
    await prisma.$transaction(async (tx)=>{
      if (action === "grant") {
        await tx.pilotAccess.upsert({where:{organizationId:orgId},create:{organizationId:orgId,planSlug:slug!,expiresAt:ends,note:"Teste controlado"},update:{planSlug:slug!,expiresAt:ends,revokedAt:null,note:"Teste controlado"}});
      } else { await tx.pilotAccess.updateMany({where:{organizationId:orgId,revokedAt:null},data:{revokedAt:new Date()}}); }
      await tx.auditEvent.create({data:{organizationId:orgId,actorUserId:master.id,category:"billing",action:`pilot.${action}`,entityType:"organization",entityId:orgId,
        metadata:action === "grant"?{planSlug:slug,expiresAt:ends.toISOString()}:{reason:"manual_revoke"}}});
    });
    console.log(action === "grant" ? `Piloto criado: ${slug} até ${ends.toISOString()}`:"Acesso piloto revogado.");
  } finally {await prisma.$disconnect();}
}
main().catch((error)=>{console.error(error instanceof Error?error.message:"FAILED");process.exitCode=1;});

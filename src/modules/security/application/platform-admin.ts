import { prisma } from "@/infrastructure/database/prisma";

export async function isPlatformMaster(userId: string) {
  const admin = await prisma.platformAdmin.findUnique({ where: { userId } });
  return Boolean(admin?.active && admin.role === "PLATFORM_MASTER");
}

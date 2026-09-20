import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";
import { prisma } from "@/infrastructure/database/prisma";

function requiredEnv(name: "BETTER_AUTH_SECRET" | "BETTER_AUTH_URL"): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} não foi configurada no ambiente.`);
  }
  return value;
}

export const auth = betterAuth({
  appName: "Jurisportal Next",
  secret: requiredEnv("BETTER_AUTH_SECRET"),
  baseURL: requiredEnv("BETTER_AUTH_URL"),
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
  },
  plugins: [organization()],
});

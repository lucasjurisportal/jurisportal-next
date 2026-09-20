import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

// O projeto usa .env.local no desenvolvimento para manter segredos fora do Git.
// Prisma não deve depender do carregamento automático do Next.js.
loadEnv({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations usam a conexão de sessão/direta. O runtime usa DATABASE_URL.
    url: env("DIRECT_URL"),
  },
});

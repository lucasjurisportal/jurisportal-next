-- v56: cupons vinculados à organização e pilotos gratuitos com validade.
-- Não altera assinaturas, não cria cobranças e não exclui registros.
CREATE TABLE "promotion_code" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "campaign" TEXT NOT NULL DEFAULT 'LEGACY_MIGRATION',
    "discountPercent" INTEGER NOT NULL DEFAULT 20,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),
    "redeemedPaymentId" TEXT,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "promotion_code_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "promotion_code_percent_check" CHECK ("discountPercent" BETWEEN 1 AND 100)
);
CREATE UNIQUE INDEX "promotion_code_codeHash_key" ON "promotion_code"("codeHash");
CREATE UNIQUE INDEX "promotion_code_organizationId_campaign_key" ON "promotion_code"("organizationId", "campaign");
CREATE UNIQUE INDEX "promotion_code_redeemedPaymentId_key" ON "promotion_code"("redeemedPaymentId");
CREATE INDEX "promotion_code_organizationId_expiresAt_idx" ON "promotion_code"("organizationId", "expiresAt");
ALTER TABLE "promotion_code" ADD CONSTRAINT "promotion_code_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "promotion_code" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "pilot_access" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planSlug" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "note" TEXT,
    CONSTRAINT "pilot_access_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "pilot_access_plan_check" CHECK ("planSlug" IN ('essencial','estrategico','premium','executivo','alta-corte'))
);
CREATE UNIQUE INDEX "pilot_access_organizationId_key" ON "pilot_access"("organizationId");
ALTER TABLE "pilot_access" ADD CONSTRAINT "pilot_access_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pilot_access" ENABLE ROW LEVEL SECURITY;

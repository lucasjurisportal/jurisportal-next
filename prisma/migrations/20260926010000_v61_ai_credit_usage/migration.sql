-- Reserva, consumo e estorno de créditos de IA por escritório e competência São Paulo.
-- SEM cobrança automática, sem integração de modelos e sem pacotes extras nesta migration.
CREATE TABLE "ai_credit_usage" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "actorUserId" UUID NOT NULL,
  "periodKey" TEXT NOT NULL,
  "requestKey" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reservedCredits" INTEGER NOT NULL,
  "chargedCredits" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'RESERVED',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ai_credit_usage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_credit_usage_period_check" CHECK ("periodKey" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT "ai_credit_usage_reserved_check" CHECK ("reservedCredits" > 0),
  CONSTRAINT "ai_credit_usage_charged_check" CHECK ("chargedCredits" >= 0 AND "chargedCredits" <= "reservedCredits"),
  CONSTRAINT "ai_credit_usage_status_check" CHECK ("status" IN ('RESERVED','SETTLED','RELEASED','EXPIRED','REFUNDED')),
  CONSTRAINT "ai_credit_usage_charge_status_check" CHECK ("chargedCredits" = 0 OR "status" IN ('SETTLED','REFUNDED'))
);
CREATE UNIQUE INDEX "ai_credit_usage_organizationId_requestKey_key" ON "ai_credit_usage"("organizationId", "requestKey");
CREATE INDEX "ai_credit_usage_organizationId_periodKey_status_idx" ON "ai_credit_usage"("organizationId", "periodKey", "status");
CREATE INDEX "ai_credit_usage_organizationId_status_expiresAt_idx" ON "ai_credit_usage"("organizationId", "status", "expiresAt");
ALTER TABLE "ai_credit_usage" ADD CONSTRAINT "ai_credit_usage_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_credit_usage" ADD CONSTRAINT "ai_credit_usage_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ai_credit_usage" ENABLE ROW LEVEL SECURITY;

-- Jurisportal Next
-- Migration: 20260915213000_clients
-- Objetivo: criar o primeiro domínio jurídico persistente: Clientes.
-- Regra: todo cliente pertence obrigatoriamente a uma organizationId.

CREATE TABLE "client" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tradeName" TEXT,
    "taxIdRaw" TEXT NOT NULL,
    "taxIdNormalized" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "primaryContactName" TEXT,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "phone" TEXT,
    "postalCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "archivedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "client_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "client_organizationId_taxIdNormalized_key" ON "client"("organizationId", "taxIdNormalized");
CREATE INDEX "client_organizationId_status_name_idx" ON "client"("organizationId", "status", "name");
CREATE INDEX "client_organizationId_kind_idx" ON "client"("organizationId", "kind");
CREATE INDEX "client_organizationId_state_idx" ON "client"("organizationId", "state");
CREATE INDEX "client_organizationId_email_idx" ON "client"("organizationId", "email");

ALTER TABLE "client" ADD CONSTRAINT "client_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client" ADD CONSTRAINT "client_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "client" ADD CONSTRAINT "client_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "client" ENABLE ROW LEVEL SECURITY;

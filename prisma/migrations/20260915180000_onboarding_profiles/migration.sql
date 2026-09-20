-- Jurisportal Next
-- Migration: 20260915180000_onboarding_profiles
-- Objetivo: persistir dados mínimos do onboarding sem misturar autenticação com domínio jurídico.

CREATE TABLE "user_profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization_profile" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "postalCode" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lawyer_oab" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rawNumber" TEXT NOT NULL,
    "normalizedNumber" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lawyer_oab_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legal_acceptance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "documentType" TEXT NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legal_acceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profile_userId_key" ON "user_profile"("userId");
CREATE UNIQUE INDEX "organization_profile_organizationId_key" ON "organization_profile"("organizationId");
CREATE UNIQUE INDEX "lawyer_oab_organizationId_normalizedNumber_state_key" ON "lawyer_oab"("organizationId", "normalizedNumber", "state");
CREATE INDEX "lawyer_oab_userId_idx" ON "lawyer_oab"("userId");
CREATE INDEX "lawyer_oab_organizationId_isActive_idx" ON "lawyer_oab"("organizationId", "isActive");
CREATE INDEX "legal_acceptance_userId_documentType_acceptedAt_idx" ON "legal_acceptance"("userId", "documentType", "acceptedAt");
CREATE INDEX "legal_acceptance_organizationId_documentType_acceptedAt_idx" ON "legal_acceptance"("organizationId", "documentType", "acceptedAt");

ALTER TABLE "user_profile" ADD CONSTRAINT "user_profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "organization_profile" ADD CONSTRAINT "organization_profile_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lawyer_oab" ADD CONSTRAINT "lawyer_oab_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lawyer_oab" ADD CONSTRAINT "lawyer_oab_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_acceptance" ADD CONSTRAINT "legal_acceptance_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "legal_acceptance" ADD CONSTRAINT "legal_acceptance_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- As tabelas vinculadas a tenant também recebem RLS. O backend continua responsável
-- por autorizar toda operação; nesta fase a conexão Prisma usa a credencial do servidor.
ALTER TABLE "organization_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "lawyer_oab" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "legal_acceptance" ENABLE ROW LEVEL SECURITY;

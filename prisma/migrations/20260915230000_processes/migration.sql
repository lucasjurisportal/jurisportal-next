-- Jurisportal Next
-- Migration: 20260915230000_processes
-- Objetivo: criar o domínio persistente de Processos, vínculos com clientes,
-- partes e linha do tempo.
--
-- Decisão comercial: processos possuem limite por plano. Arquivar ou encerrar
-- não libera vaga automaticamente; o registro continua consumindo capacidade.

CREATE TABLE "process" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "cnjRaw" TEXT NOT NULL,
    "cnjNormalized" TEXT NOT NULL,
    "cnjFormatted" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "court" TEXT,
    "division" TEXT,
    "district" TEXT,
    "processClass" TEXT,
    "subject" TEXT,
    "distributionDate" TIMESTAMP(3),
    "responsibleUserId" UUID,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "process_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "process_client" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "partyRole" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_client_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "process_party" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "document" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "process_party_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "process_timeline_event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "eventDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_timeline_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "process_organizationId_cnjNormalized_key" ON "process"("organizationId", "cnjNormalized");
CREATE INDEX "process_organizationId_status_updatedAt_idx" ON "process"("organizationId", "status", "updatedAt");
CREATE INDEX "process_organizationId_responsibleUserId_idx" ON "process"("organizationId", "responsibleUserId");
CREATE INDEX "process_organizationId_subject_idx" ON "process"("organizationId", "subject");

CREATE UNIQUE INDEX "process_client_processId_clientId_key" ON "process_client"("processId", "clientId");
CREATE INDEX "process_client_organizationId_clientId_idx" ON "process_client"("organizationId", "clientId");
CREATE INDEX "process_client_organizationId_processId_idx" ON "process_client"("organizationId", "processId");

CREATE INDEX "process_party_organizationId_processId_idx" ON "process_party"("organizationId", "processId");
CREATE INDEX "process_party_organizationId_name_idx" ON "process_party"("organizationId", "name");

CREATE INDEX "process_timeline_event_organizationId_processId_eventDate_idx" ON "process_timeline_event"("organizationId", "processId", "eventDate");
CREATE INDEX "process_timeline_event_organizationId_kind_eventDate_idx" ON "process_timeline_event"("organizationId", "kind", "eventDate");

ALTER TABLE "process" ADD CONSTRAINT "process_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process" ADD CONSTRAINT "process_responsibleUserId_fkey"
  FOREIGN KEY ("responsibleUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process" ADD CONSTRAINT "process_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process" ADD CONSTRAINT "process_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "process_client" ADD CONSTRAINT "process_client_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_client" ADD CONSTRAINT "process_client_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_client" ADD CONSTRAINT "process_client_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "process_party" ADD CONSTRAINT "process_party_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_party" ADD CONSTRAINT "process_party_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "process_timeline_event" ADD CONSTRAINT "process_timeline_event_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_timeline_event" ADD CONSTRAINT "process_timeline_event_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_timeline_event" ADD CONSTRAINT "process_timeline_event_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Defesa adicional. O backend continua obrigatório para autorização multi-tenant.
ALTER TABLE "process" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_client" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_party" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_timeline_event" ENABLE ROW LEVEL SECURITY;

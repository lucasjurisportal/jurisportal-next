-- Jurisportal Next
-- Migration: 20260916210000_work_management_agenda
-- Objetivo: integrar Prazos e Tarefas à Agenda, criar compromissos/audiências
-- e adicionar Valor da Causa + cálculo estruturado de honorários.
--
-- REGRA IMPORTANTE:
-- Prazos e tarefas continuam em process_work_item e NÃO são duplicados na agenda.
-- A Agenda é uma projeção de ProcessWorkItem + AgendaEvent. Isso evita divergência de dados.

ALTER TABLE "process" ADD COLUMN "caseValue" DECIMAL(14,2);

ALTER TABLE "process_fee_agreement"
  ADD COLUMN "fixedAmount" DECIMAL(14,2),
  ADD COLUMN "percentageBase" TEXT NOT NULL DEFAULT 'CASE_VALUE';

-- Preserva contratos fixos já cadastrados: o antigo contractedAmount passa a representar
-- também a parcela fixa quando o modelo existente era FIXED.
UPDATE "process_fee_agreement"
SET "fixedAmount" = "contractedAmount"
WHERE "model" = 'FIXED' AND "fixedAmount" IS NULL;

CREATE TABLE "agenda_event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eventDate" DATE NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,
    "responsibleUserId" UUID,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "notes" TEXT,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "agenda_event_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agenda_event_organizationId_eventDate_startTime_idx"
  ON "agenda_event"("organizationId", "eventDate", "startTime");
CREATE INDEX "agenda_event_organizationId_responsibleUserId_eventDate_idx"
  ON "agenda_event"("organizationId", "responsibleUserId", "eventDate");
CREATE INDEX "agenda_event_organizationId_processId_eventDate_idx"
  ON "agenda_event"("organizationId", "processId", "eventDate");

ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_responsibleUserId_fkey"
  FOREIGN KEY ("responsibleUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "agenda_event" ADD CONSTRAINT "agenda_event_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agenda_event" ENABLE ROW LEVEL SECURITY;

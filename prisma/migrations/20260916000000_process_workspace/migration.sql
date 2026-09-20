-- Jurisportal Next
-- Migration: 20260916000000_process_workspace
-- Objetivo: transformar a tela do processo em um workspace operacional real,
-- adicionando prazos/tarefas e financeiro jurídico sem depender de APIs pagas.
--
-- IMPORTANTE:
-- 1. Publicações e documentos continuam módulos separados; entram em etapas próprias.
-- 2. Datas de prazo são armazenadas como DATE + horário textual para evitar conversão
--    acidental de fuso em uma data jurídica.
-- 3. Financeiro aqui é jurídico-operacional, não contabilidade/ERP.

CREATE TABLE "process_work_item" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATE,
    "dueTime" TEXT,
    "responsibleUserId" UUID,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isFatal" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "process_work_item_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "process_fee_agreement" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'FIXED',
    "contractedAmount" DECIMAL(14,2),
    "successPercentage" DECIMAL(5,2),
    "successBase" TEXT,
    "notes" TEXT,
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "process_fee_agreement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "process_finance_entry" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "entryDate" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paidBy" TEXT,
    "reimbursable" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "process_finance_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "process_work_item_organizationId_processId_status_dueDate_idx"
  ON "process_work_item"("organizationId", "processId", "status", "dueDate");
CREATE INDEX "process_work_item_organizationId_responsibleUserId_status_dueDate_idx"
  ON "process_work_item"("organizationId", "responsibleUserId", "status", "dueDate");
CREATE INDEX "process_work_item_organizationId_kind_status_idx"
  ON "process_work_item"("organizationId", "kind", "status");

CREATE UNIQUE INDEX "process_fee_agreement_processId_key" ON "process_fee_agreement"("processId");
CREATE INDEX "process_fee_agreement_organizationId_processId_idx"
  ON "process_fee_agreement"("organizationId", "processId");

CREATE INDEX "process_finance_entry_organizationId_processId_entryDate_idx"
  ON "process_finance_entry"("organizationId", "processId", "entryDate");
CREATE INDEX "process_finance_entry_organizationId_kind_status_idx"
  ON "process_finance_entry"("organizationId", "kind", "status");

ALTER TABLE "process_work_item" ADD CONSTRAINT "process_work_item_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_work_item" ADD CONSTRAINT "process_work_item_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_work_item" ADD CONSTRAINT "process_work_item_responsibleUserId_fkey"
  FOREIGN KEY ("responsibleUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process_work_item" ADD CONSTRAINT "process_work_item_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process_work_item" ADD CONSTRAINT "process_work_item_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "process_fee_agreement" ADD CONSTRAINT "process_fee_agreement_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_fee_agreement" ADD CONSTRAINT "process_fee_agreement_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_fee_agreement" ADD CONSTRAINT "process_fee_agreement_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process_fee_agreement" ADD CONSTRAINT "process_fee_agreement_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "process_finance_entry" ADD CONSTRAINT "process_finance_entry_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_finance_entry" ADD CONSTRAINT "process_finance_entry_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_finance_entry" ADD CONSTRAINT "process_finance_entry_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "process_work_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_fee_agreement" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "process_finance_entry" ENABLE ROW LEVEL SECURITY;

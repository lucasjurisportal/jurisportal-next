-- v46: movimentações externas somente de processos previamente cadastrados; migração aditiva.
ALTER TABLE "process" ADD COLUMN "lastMovementCheckAt" TIMESTAMP(3);
CREATE INDEX "process_organizationId_lastMovementCheckAt_idx"
  ON "process"("organizationId", "lastMovementCheckAt");

CREATE TABLE "process_external_movement" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "processId" UUID NOT NULL,
  "source" TEXT NOT NULL,
  "externalKey" TEXT NOT NULL,
  "code" INTEGER,
  "name" TEXT NOT NULL,
  "occurredAt" TEXT,
  "judicialBody" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "process_external_movement_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "process_external_movement_organizationId_processId_source_externalKey_key"
  ON "process_external_movement"("organizationId", "processId", "source", "externalKey");
CREATE INDEX "process_external_movement_organizationId_processId_occurredAt_idx"
  ON "process_external_movement"("organizationId", "processId", "occurredAt");
ALTER TABLE "process_external_movement" ADD CONSTRAINT "process_external_movement_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_external_movement" ADD CONSTRAINT "process_external_movement_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_external_movement" ENABLE ROW LEVEL SECURITY;

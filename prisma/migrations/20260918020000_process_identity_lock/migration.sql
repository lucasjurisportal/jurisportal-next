-- Jurisportal Next
-- Migration: 20260918020000_process_identity_lock
-- Objetivo: criar referência interna anual por escritório e tornar o CNJ uma identidade
-- confirmada/imutável para usuários comuns. Correções excepcionais ficam auditadas.

ALTER TABLE "process"
  ADD COLUMN "internalCode" TEXT,
  ADD COLUMN "internalYear" INTEGER,
  ADD COLUMN "internalSequence" INTEGER,
  ADD COLUMN "cnjLockedAt" TIMESTAMP(3),
  ADD COLUMN "cnjLockedByUserId" UUID;

-- Processos já existentes recebem numeração interna determinística por escritório/ano.
-- A ordenação usa o momento de cadastro e o UUID apenas como desempate estável.
WITH ranked AS (
  SELECT
    "id",
    "organizationId",
    EXTRACT(YEAR FROM ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'))::INTEGER AS ref_year,
    ROW_NUMBER() OVER (
      PARTITION BY "organizationId", EXTRACT(YEAR FROM ("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo'))
      ORDER BY "createdAt", "id"
    )::INTEGER AS ref_sequence
  FROM "process"
)
UPDATE "process" AS p
SET
  "internalYear" = ranked.ref_year,
  "internalSequence" = ranked.ref_sequence,
  "internalCode" = ranked.ref_year::TEXT || LPAD(ranked.ref_sequence::TEXT, 4, '0'),
  "cnjLockedAt" = p."createdAt",
  "cnjLockedByUserId" = p."createdByUserId"
FROM ranked
WHERE p."id" = ranked."id";

CREATE TABLE "process_number_sequence" (
  "organizationId" UUID NOT NULL,
  "year" INTEGER NOT NULL,
  "lastValue" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "process_number_sequence_pkey" PRIMARY KEY ("organizationId", "year")
);

-- Continua a sequência a partir dos processos que já existiam antes desta migration.
INSERT INTO "process_number_sequence" ("organizationId", "year", "lastValue", "updatedAt")
SELECT "organizationId", "internalYear", MAX("internalSequence"), CURRENT_TIMESTAMP
FROM "process"
GROUP BY "organizationId", "internalYear";

ALTER TABLE "process"
  ALTER COLUMN "internalCode" SET NOT NULL,
  ALTER COLUMN "internalYear" SET NOT NULL,
  ALTER COLUMN "internalSequence" SET NOT NULL,
  ALTER COLUMN "cnjLockedAt" SET NOT NULL;

CREATE UNIQUE INDEX "process_organizationId_internalCode_key"
  ON "process"("organizationId", "internalCode");
CREATE UNIQUE INDEX "process_organizationId_internalYear_internalSequence_key"
  ON "process"("organizationId", "internalYear", "internalSequence");

ALTER TABLE "process" ADD CONSTRAINT "process_cnjLockedByUserId_fkey"
  FOREIGN KEY ("cnjLockedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "process_number_sequence" ADD CONSTRAINT "process_number_sequence_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "process_number_sequence" ENABLE ROW LEVEL SECURITY;

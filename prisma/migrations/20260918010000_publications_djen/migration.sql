-- Jurisportal Next
-- Migration: 20260918010000_publications_djen
-- Objetivo: persistir Publicações/Intimações capturadas do DJeN com deduplicação,
-- vínculo por CNJ e revisão humana obrigatória antes de virar prazo.

CREATE TABLE "publication" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID,
    "source" TEXT NOT NULL DEFAULT 'DJEN',
    "externalKey" TEXT NOT NULL,
    "externalId" TEXT,
    "sourceHash" TEXT,
    "kind" TEXT NOT NULL,
    "communicationType" TEXT NOT NULL,
    "documentType" TEXT,
    "court" TEXT,
    "judicialBody" TEXT,
    "processNumberRaw" TEXT,
    "processNumberNormalized" TEXT,
    "processNumberFormatted" TEXT,
    "publicationDate" DATE NOT NULL,
    "content" TEXT NOT NULL,
    "parties" JSONB,
    "explicitDates" JSONB,
    "sourceUrl" TEXT,
    "sourceStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "cancellationReason" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "readByUserId" UUID,
    "treatedAt" TIMESTAMP(3),
    "treatedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "publication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "publication_recipient" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "lawyerOabId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "publication_recipient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "deadline_review" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "publicationId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "origin" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "suggestedDate" DATE,
    "sourceTextReference" TEXT,
    "confirmedDate" DATE,
    "confirmedByUserId" UUID,
    "confirmedAt" TIMESTAMP(3),
    "dismissedByUserId" UUID,
    "dismissedAt" TIMESTAMP(3),
    "workItemId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "deadline_review_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "publication_organizationId_source_externalKey_key"
  ON "publication"("organizationId", "source", "externalKey");
CREATE INDEX "publication_organizationId_publicationDate_idx"
  ON "publication"("organizationId", "publicationDate");
CREATE INDEX "publication_organizationId_kind_publicationDate_idx"
  ON "publication"("organizationId", "kind", "publicationDate");
CREATE INDEX "publication_organizationId_treatedAt_readAt_idx"
  ON "publication"("organizationId", "treatedAt", "readAt");
CREATE INDEX "publication_organizationId_processId_publicationDate_idx"
  ON "publication"("organizationId", "processId", "publicationDate");

CREATE UNIQUE INDEX "publication_recipient_publicationId_lawyerOabId_key"
  ON "publication_recipient"("publicationId", "lawyerOabId");
CREATE INDEX "publication_recipient_organizationId_lawyerOabId_idx"
  ON "publication_recipient"("organizationId", "lawyerOabId");

CREATE UNIQUE INDEX "deadline_review_publicationId_key" ON "deadline_review"("publicationId");
CREATE UNIQUE INDEX "deadline_review_workItemId_key" ON "deadline_review"("workItemId");
CREATE INDEX "deadline_review_organizationId_status_createdAt_idx"
  ON "deadline_review"("organizationId", "status", "createdAt");

ALTER TABLE "publication" ADD CONSTRAINT "publication_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication" ADD CONSTRAINT "publication_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publication" ADD CONSTRAINT "publication_readByUserId_fkey"
  FOREIGN KEY ("readByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "publication" ADD CONSTRAINT "publication_treatedByUserId_fkey"
  FOREIGN KEY ("treatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "publication_recipient" ADD CONSTRAINT "publication_recipient_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication_recipient" ADD CONSTRAINT "publication_recipient_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication_recipient" ADD CONSTRAINT "publication_recipient_lawyerOabId_fkey"
  FOREIGN KEY ("lawyerOabId") REFERENCES "lawyer_oab"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "deadline_review" ADD CONSTRAINT "deadline_review_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deadline_review" ADD CONSTRAINT "deadline_review_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deadline_review" ADD CONSTRAINT "deadline_review_confirmedByUserId_fkey"
  FOREIGN KEY ("confirmedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deadline_review" ADD CONSTRAINT "deadline_review_dismissedByUserId_fkey"
  FOREIGN KEY ("dismissedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "deadline_review" ADD CONSTRAINT "deadline_review_workItemId_fkey"
  FOREIGN KEY ("workItemId") REFERENCES "process_work_item"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "publication" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "publication_recipient" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deadline_review" ENABLE ROW LEVEL SECURITY;

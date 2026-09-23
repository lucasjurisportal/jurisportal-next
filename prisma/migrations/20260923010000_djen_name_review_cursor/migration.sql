-- v41: busca independente por nome, revisão de identidade e cursor de captura por OAB.
-- Migration aditiva; não altera migrations anteriores e não remove publicações existentes.
ALTER TABLE "publication" ADD COLUMN "summary" TEXT;

CREATE TABLE "djen_review_candidate" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "lawyerOabId" UUID NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'DJEN',
  "externalKey" TEXT NOT NULL,
  "searchMethod" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "decidedByUserId" UUID,
  "decidedAt" TIMESTAMP(3),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "djen_review_candidate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "djen_candidate_org_oab_source_key"
  ON "djen_review_candidate"("organizationId", "lawyerOabId", "source", "externalKey");
CREATE INDEX "djen_review_candidate_organizationId_status_lastSeenAt_idx"
  ON "djen_review_candidate"("organizationId", "status", "lastSeenAt");
ALTER TABLE "djen_review_candidate" ADD CONSTRAINT "djen_review_candidate_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "djen_review_candidate" ADD CONSTRAINT "djen_review_candidate_lawyerOabId_fkey"
  FOREIGN KEY ("lawyerOabId") REFERENCES "lawyer_oab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "djen_review_candidate" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "djen_capture_cursor" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "lawyerOabId" UUID NOT NULL,
  "completedThrough" DATE,
  "lastAttemptAt" TIMESTAMP(3),
  "lastSuccessAt" TIMESTAMP(3),
  "lastError" TEXT,
  "status" TEXT NOT NULL DEFAULT 'IDLE',
  "leaseToken" TEXT,
  "leaseUntil" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "djen_capture_cursor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "djen_capture_cursor_lawyerOabId_key" ON "djen_capture_cursor"("lawyerOabId");
CREATE INDEX "djen_capture_cursor_organizationId_status_idx" ON "djen_capture_cursor"("organizationId", "status");
ALTER TABLE "djen_capture_cursor" ADD CONSTRAINT "djen_capture_cursor_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "djen_capture_cursor" ADD CONSTRAINT "djen_capture_cursor_lawyerOabId_fkey"
  FOREIGN KEY ("lawyerOabId") REFERENCES "lawyer_oab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "djen_capture_cursor" ENABLE ROW LEVEL SECURITY;

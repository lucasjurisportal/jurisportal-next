-- v43: dados processuais de origem e envio individual auditável por destinatário.
-- Migration aditiva: não altera histórico de comunicações nem datas jurídicas.
ALTER TABLE "process" ADD COLUMN "forum" TEXT;
ALTER TABLE "publication" ADD COLUMN "processMetadata" JSONB;

CREATE TABLE "publication_email_delivery" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "publicationId" UUID NOT NULL,
  "lawyerOabId" UUID NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "batchKey" TEXT,
  "providerEmailId" TEXT,
  "recipientEmail" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "firstAttemptAt" TIMESTAMP(3),
  "leaseUntil" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "publication_email_delivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "publication_email_delivery_publicationId_lawyerOabId_key"
  ON "publication_email_delivery"("publicationId", "lawyerOabId");
CREATE INDEX "publication_email_delivery_organizationId_status_leaseUntil_idx"
  ON "publication_email_delivery"("organizationId", "status", "leaseUntil");
ALTER TABLE "publication_email_delivery" ADD CONSTRAINT "publication_email_delivery_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication_email_delivery" ADD CONSTRAINT "publication_email_delivery_publicationId_fkey"
  FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication_email_delivery" ADD CONSTRAINT "publication_email_delivery_lawyerOabId_fkey"
  FOREIGN KEY ("lawyerOabId") REFERENCES "lawyer_oab"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "publication_email_delivery" ENABLE ROW LEVEL SECURITY;

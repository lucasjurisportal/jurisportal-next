-- v39.7: acompanhamento de copia verificada de documentos, sem substituir os dados originais.
ALTER TABLE "process_document"
  ADD COLUMN "backupStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "backupObjectKey" TEXT,
  ADD COLUMN "backupSha256" TEXT,
  ADD COLUMN "backupVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "backupAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "backupLastError" TEXT,
  ADD COLUMN "backupNextAttemptAt" TIMESTAMP(3),
  ADD COLUMN "backupLeaseUntil" TIMESTAMP(3),
  ADD COLUMN "backupAttemptId" UUID;
CREATE INDEX "process_document_backupStatus_backupNextAttemptAt_idx"
  ON "process_document"("backupStatus", "backupNextAttemptAt");

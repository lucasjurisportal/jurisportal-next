-- v39: armazenamento privado por processo. Uma migration; sem tocar nas migrations anteriores.
CREATE TABLE "organization_storage_usage" (
    "organizationId" UUID NOT NULL,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "reservedBytes" BIGINT NOT NULL DEFAULT 0,
    "extraBytes" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "organization_storage_usage_pkey" PRIMARY KEY ("organizationId")
);
CREATE TABLE "process_document" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "originalName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "sizeBytes" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'UPLOAD',
    "uploadExpiresAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "process_document_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "process_document_storageKey_key" ON "process_document"("storageKey");
CREATE INDEX "process_document_organizationId_processId_status_createdAt_idx" ON "process_document"("organizationId", "processId", "status", "createdAt");
CREATE INDEX "process_document_status_uploadExpiresAt_idx" ON "process_document"("status", "uploadExpiresAt");
CREATE INDEX "process_document_status_deletedAt_idx" ON "process_document"("status", "deletedAt");
ALTER TABLE "organization_storage_usage" ADD CONSTRAINT "organization_storage_usage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_document" ADD CONSTRAINT "process_document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_document" ADD CONSTRAINT "process_document_processId_fkey" FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "process_document" ADD CONSTRAINT "process_document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

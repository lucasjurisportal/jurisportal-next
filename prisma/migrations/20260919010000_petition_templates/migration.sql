-- Jurisportal Next
-- Migration: 20260919010000_petition_templates
-- Objetivo: tornar Modelos de Petições funcional com modelos próprios por escritório,
-- histórico de versões e registro auditável dos rascunhos gerados.

CREATE TABLE "petition_template" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "scope" TEXT NOT NULL DEFAULT 'GENERAL',
  "content" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "currentVersion" INTEGER NOT NULL DEFAULT 1,
  "createdByUserId" UUID,
  "updatedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "petition_template_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "petition_template_version" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "petition_template_version_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "petition_generation" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "templateId" UUID,
  "officialTemplateKey" TEXT,
  "templateSource" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "templateVersion" INTEGER NOT NULL,
  "processId" UUID,
  "clientId" UUID,
  "renderedContent" TEXT NOT NULL,
  "generatedByUserId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "petition_generation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "petition_template_organizationId_status_updatedAt_idx"
  ON "petition_template"("organizationId", "status", "updatedAt");
CREATE INDEX "petition_template_organizationId_category_idx"
  ON "petition_template"("organizationId", "category");
CREATE INDEX "petition_template_organizationId_name_idx"
  ON "petition_template"("organizationId", "name");
CREATE UNIQUE INDEX "petition_template_version_templateId_version_key"
  ON "petition_template_version"("templateId", "version");
CREATE INDEX "petition_template_version_organizationId_templateId_version_idx"
  ON "petition_template_version"("organizationId", "templateId", "version");
CREATE INDEX "petition_generation_organizationId_createdAt_idx"
  ON "petition_generation"("organizationId", "createdAt");
CREATE INDEX "petition_generation_organizationId_processId_createdAt_idx"
  ON "petition_generation"("organizationId", "processId", "createdAt");
CREATE INDEX "petition_generation_organizationId_clientId_createdAt_idx"
  ON "petition_generation"("organizationId", "clientId", "createdAt");

ALTER TABLE "petition_template" ADD CONSTRAINT "petition_template_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "petition_template" ADD CONSTRAINT "petition_template_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petition_template" ADD CONSTRAINT "petition_template_updatedByUserId_fkey"
  FOREIGN KEY ("updatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "petition_template_version" ADD CONSTRAINT "petition_template_version_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "petition_template_version" ADD CONSTRAINT "petition_template_version_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "petition_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "petition_template_version" ADD CONSTRAINT "petition_template_version_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "petition_generation" ADD CONSTRAINT "petition_generation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "petition_generation" ADD CONSTRAINT "petition_generation_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "petition_template"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petition_generation" ADD CONSTRAINT "petition_generation_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "process"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petition_generation" ADD CONSTRAINT "petition_generation_clientId_fkey"
  FOREIGN KEY ("clientId") REFERENCES "client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "petition_generation" ADD CONSTRAINT "petition_generation_generatedByUserId_fkey"
  FOREIGN KEY ("generatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "petition_template" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "petition_template_version" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "petition_generation" ENABLE ROW LEVEL SECURITY;

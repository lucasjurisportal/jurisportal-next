-- v62: resultados auditáveis das ações de IA. Não duplica o texto-fonte da publicação.
CREATE TABLE "ai_generation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "publicationId" UUID,
    "requestKey" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "estimatedCredits" INTEGER NOT NULL,
    "chargedCredits" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "providerResponseId" TEXT,
    "output" JSONB,
    "failureCode" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_generation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ai_generation_status_check" CHECK ("status" IN ('PENDING','COMPLETED','FAILED')),
    CONSTRAINT "ai_generation_estimated_credits_check" CHECK ("estimatedCredits" > 0),
    CONSTRAINT "ai_generation_charged_credits_check" CHECK ("chargedCredits" >= 0)
);

CREATE UNIQUE INDEX "ai_generation_organizationId_requestKey_key"
ON "ai_generation"("organizationId", "requestKey");

CREATE INDEX "ai_generation_organizationId_publicationId_action_createdAt_idx"
ON "ai_generation"("organizationId", "publicationId", "action", "createdAt");

CREATE INDEX "ai_generation_organizationId_status_createdAt_idx"
ON "ai_generation"("organizationId", "status", "createdAt");

ALTER TABLE "ai_generation"
ADD CONSTRAINT "ai_generation_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ai_generation"
ADD CONSTRAINT "ai_generation_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ai_generation"
ADD CONSTRAINT "ai_generation_publicationId_fkey"
FOREIGN KEY ("publicationId") REFERENCES "publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

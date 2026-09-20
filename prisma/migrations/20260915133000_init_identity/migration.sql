-- Jurisportal Next
-- Migration: 20260915133000_init_identity
-- Objetivo: criar a fundação de identidade, multi-tenant, assinatura e auditoria.
--
-- IMPORTANTE:
-- 1. Esta migration NÃO cria Clientes, Processos, Publicações ou Prazos ainda.
-- 2. Todas as entidades de negócio futuras carregarão organizationId.
-- 3. RLS será tratado como defesa adicional. A conexão administrativa `postgres`
--    usada durante migrations pode ignorar RLS; portanto, RLS nunca substituirá
--    autorização no backend.

CREATE TABLE "user" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "session" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "activeOrganizationId" UUID,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "account" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "organization" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscription" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planSlug" TEXT NOT NULL,
    "billingCycle" TEXT NOT NULL,
    "commercialPeriod" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_event" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorUserId" UUID,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_email_key" ON "user"("email");
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE INDEX "session_activeOrganizationId_idx" ON "session"("activeOrganizationId");
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");
CREATE UNIQUE INDEX "member_organizationId_userId_key" ON "member"("organizationId", "userId");
CREATE INDEX "member_userId_idx" ON "member"("userId");
CREATE INDEX "invitation_organizationId_idx" ON "invitation"("organizationId");
CREATE INDEX "invitation_email_idx" ON "invitation"("email");
CREATE UNIQUE INDEX "subscription_organizationId_key" ON "subscription"("organizationId");
CREATE INDEX "subscription_planSlug_idx" ON "subscription"("planSlug");
CREATE INDEX "subscription_status_idx" ON "subscription"("status");
CREATE INDEX "audit_event_organizationId_createdAt_idx" ON "audit_event"("organizationId", "createdAt");
CREATE INDEX "audit_event_actorUserId_createdAt_idx" ON "audit_event"("actorUserId", "createdAt");
CREATE INDEX "audit_event_entityType_entityId_idx" ON "audit_event"("entityType", "entityId");

ALTER TABLE "session"
    ADD CONSTRAINT "session_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account"
    ADD CONSTRAINT "account_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member"
    ADD CONSTRAINT "member_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "member"
    ADD CONSTRAINT "member_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation"
    ADD CONSTRAINT "invitation_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invitation"
    ADD CONSTRAINT "invitation_inviterId_fkey"
    FOREIGN KEY ("inviterId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscription"
    ADD CONSTRAINT "subscription_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_event"
    ADD CONSTRAINT "audit_event_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "audit_event"
    ADD CONSTRAINT "audit_event_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS explícito nas tabelas de tenant. Nesta fase não criamos políticas permissivas.
-- A aplicação ainda não deve consultar essas tabelas em nome de clientes até a
-- camada de autenticação/autorização estar instalada e testada.
ALTER TABLE "organization" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "member" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_event" ENABLE ROW LEVEL SECURITY;

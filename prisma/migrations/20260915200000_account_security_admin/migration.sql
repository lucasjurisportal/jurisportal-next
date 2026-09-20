-- Jurisportal Next
-- Migration: 20260915200000_account_security_admin
-- Objetivo: confirmação de e-mail, 2FA, dispositivos confiáveis, recuperação e administração global.

ALTER TABLE "session" ADD COLUMN "secondFactorVerifiedAt" TIMESTAMP(3);

CREATE TABLE "user_security_profile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "recoveryRequired" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorLockedAt" TIMESTAMP(3),
    "lastRecoveryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_security_profile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_challenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "purpose" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "destinationMasked" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resendAvailableAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),
    "deliveryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "auth_challenge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trusted_device" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgentHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trusted_device_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_admin" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PLATFORM_MASTER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_admin_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "security_event" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "sessionId" UUID,
    "type" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_event_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_security_profile_userId_key" ON "user_security_profile"("userId");
CREATE INDEX "auth_challenge_userId_purpose_createdAt_idx" ON "auth_challenge"("userId", "purpose", "createdAt");
CREATE INDEX "auth_challenge_sessionId_purpose_idx" ON "auth_challenge"("sessionId", "purpose");
CREATE INDEX "auth_challenge_expiresAt_idx" ON "auth_challenge"("expiresAt");
CREATE UNIQUE INDEX "trusted_device_tokenHash_key" ON "trusted_device"("tokenHash");
CREATE INDEX "trusted_device_userId_expiresAt_idx" ON "trusted_device"("userId", "expiresAt");
CREATE UNIQUE INDEX "platform_admin_userId_key" ON "platform_admin"("userId");
CREATE INDEX "security_event_userId_createdAt_idx" ON "security_event"("userId", "createdAt");
CREATE INDEX "security_event_type_createdAt_idx" ON "security_event"("type", "createdAt");

ALTER TABLE "user_security_profile" ADD CONSTRAINT "user_security_profile_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_challenge" ADD CONSTRAINT "auth_challenge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "trusted_device" ADD CONSTRAINT "trusted_device_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "platform_admin" ADD CONSTRAINT "platform_admin_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "security_event" ADD CONSTRAINT "security_event_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Estas tabelas nunca devem ser expostas diretamente ao navegador.
ALTER TABLE "user_security_profile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "auth_challenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trusted_device" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_admin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_event" ENABLE ROW LEVEL SECURITY;

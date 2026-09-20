-- Jurisportal Next
-- Migration: 20260917010000_google_calendar
-- Objetivo: conexão individual com Google Calendar e vínculo idempotente entre
-- itens locais e eventos externos. Jurisportal continua sendo a fonte de verdade.

CREATE TABLE "google_calendar_connection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GOOGLE',
    "calendarId" TEXT NOT NULL DEFAULT 'primary',
    "encryptedAccessToken" TEXT,
    "encryptedRefreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONNECTED',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "google_calendar_connection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "external_calendar_event_link" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'GOOGLE',
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "externalCalendarId" TEXT NOT NULL DEFAULT 'primary',
    "externalEventId" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'SYNCED',
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_calendar_event_link_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "google_calendar_connection_organizationId_userId_key"
  ON "google_calendar_connection"("organizationId", "userId");
CREATE INDEX "google_calendar_connection_userId_status_idx"
  ON "google_calendar_connection"("userId", "status");
CREATE INDEX "google_calendar_connection_organizationId_status_idx"
  ON "google_calendar_connection"("organizationId", "status");

CREATE UNIQUE INDEX "external_calendar_event_link_provider_organizationId_sourceType_sourceId_key"
  ON "external_calendar_event_link"("provider", "organizationId", "sourceType", "sourceId");
CREATE INDEX "external_calendar_event_link_organizationId_userId_provider_idx"
  ON "external_calendar_event_link"("organizationId", "userId", "provider");
CREATE INDEX "external_calendar_event_link_organizationId_syncStatus_idx"
  ON "external_calendar_event_link"("organizationId", "syncStatus");

ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "google_calendar_connection" ADD CONSTRAINT "google_calendar_connection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_calendar_event_link" ADD CONSTRAINT "external_calendar_event_link_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_calendar_event_link" ADD CONSTRAINT "external_calendar_event_link_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "google_calendar_connection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "external_calendar_event_link" ENABLE ROW LEVEL SECURITY;

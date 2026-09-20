CREATE TABLE "team_member_profile" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "accessLevel" TEXT NOT NULL,
  "jobTitle" TEXT,
  "oabState" TEXT,
  "oabNumber" TEXT,
  "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "removedAt" TIMESTAMP(3),
  "removedByUserId" UUID,
  "lastActiveAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "team_member_profile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "team_member_profile_userId_key" ON "team_member_profile"("userId");
CREATE INDEX "team_member_profile_organizationId_status_idx" ON "team_member_profile"("organizationId", "status");
CREATE INDEX "team_member_profile_organizationId_accessLevel_idx" ON "team_member_profile"("organizationId", "accessLevel");
ALTER TABLE "team_member_profile" ADD CONSTRAINT "team_member_profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "team_member_profile" ADD CONSTRAINT "team_member_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

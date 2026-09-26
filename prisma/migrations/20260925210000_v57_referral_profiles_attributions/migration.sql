-- v57: código de convite estável por usuário e atribuição única por escritório.
-- Não cria cobranças, não concede mês grátis, não efetua repasses.
CREATE TABLE "referral_profile" (
    "userId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "referral_profile_pkey" PRIMARY KEY ("userId")
);
CREATE UNIQUE INDEX "referral_profile_code_key" ON "referral_profile"("code");
ALTER TABLE "referral_profile" ADD CONSTRAINT "referral_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_profile" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "referral_attribution" (
    "id" UUID NOT NULL,
    "invitedOrganizationId" UUID NOT NULL,
    "referrerUserId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_PAYMENT',
    "discountPercent" INTEGER NOT NULL DEFAULT 10,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "firstPaidAt" TIMESTAMP(3),
    "firstPaymentId" TEXT,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "referral_attribution_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "referral_attribution_discountPercent_check" CHECK ("discountPercent" = 10),
    CONSTRAINT "referral_attribution_paid_consistency_check" CHECK (
      ("firstPaidAt" IS NULL AND "firstPaymentId" IS NULL) OR
      ("firstPaidAt" IS NOT NULL AND "firstPaymentId" IS NOT NULL)
    )
);
CREATE UNIQUE INDEX "referral_attribution_invitedOrganizationId_key" ON "referral_attribution"("invitedOrganizationId");
CREATE UNIQUE INDEX "referral_attribution_firstPaymentId_key" ON "referral_attribution"("firstPaymentId");
CREATE INDEX "referral_attribution_referrerUserId_firstPaidAt_idx" ON "referral_attribution"("referrerUserId", "firstPaidAt");
ALTER TABLE "referral_attribution" ADD CONSTRAINT "referral_attribution_invitedOrganizationId_fkey" FOREIGN KEY ("invitedOrganizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "referral_attribution" ADD CONSTRAINT "referral_attribution_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_attribution" ENABLE ROW LEVEL SECURITY;

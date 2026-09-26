-- Base contábil para mensalidades de indicados; não realiza pagamentos.
-- Uma competência por escritório indicado; um ID de cobrança só pode ser contabilizado uma vez.
CREATE TABLE "referral_commission_entry" (
  "id" UUID NOT NULL,
  "referrerUserId" UUID NOT NULL,
  "invitedOrganizationId" UUID NOT NULL,
  "externalPaymentId" TEXT NOT NULL,
  "competenceMonth" DATE NOT NULL,
  "paymentReceivedAt" TIMESTAMP(3) NOT NULL,
  "eligibleAt" TIMESTAMP(3),
  "amountCents" INTEGER NOT NULL DEFAULT 3000,
  "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
  "settledAt" TIMESTAMP(3),
  "transferReference" TEXT,
  "reversedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "referral_commission_entry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "referral_commission_entry_amount_check" CHECK ("amountCents" = 3000),
  CONSTRAINT "referral_commission_entry_status_check" CHECK ("status" IN ('PENDING_REVIEW','QUALIFIED','PAID','REVERSED')),
  CONSTRAINT "referral_commission_entry_settled_check" CHECK ("status" <> 'PAID' OR ("settledAt" IS NOT NULL AND "transferReference" IS NOT NULL)),
  CONSTRAINT "referral_commission_entry_qualified_check" CHECK ("status" NOT IN ('QUALIFIED', 'PAID') OR "eligibleAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "referral_commission_entry_externalPaymentId_key" ON "referral_commission_entry"("externalPaymentId");
CREATE UNIQUE INDEX "referral_commission_entry_transferReference_key" ON "referral_commission_entry"("transferReference");
CREATE UNIQUE INDEX "referral_commission_entry_invitedOrganizationId_competenceMonth_key" ON "referral_commission_entry"("invitedOrganizationId", "competenceMonth");
CREATE INDEX "referral_commission_entry_referrerUserId_competenceMonth_status_idx" ON "referral_commission_entry"("referrerUserId", "competenceMonth", "status");
ALTER TABLE "referral_commission_entry" ADD CONSTRAINT "referral_commission_entry_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_commission_entry" ADD CONSTRAINT "referral_commission_entry_invitedOrganizationId_fkey" FOREIGN KEY ("invitedOrganizationId") REFERENCES "organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "referral_commission_entry" ENABLE ROW LEVEL SECURITY;

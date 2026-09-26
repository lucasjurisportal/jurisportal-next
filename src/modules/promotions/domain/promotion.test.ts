import assert from "node:assert/strict";
import test from "node:test";
import { migrationDiscountEligibility, pilotEntitlement, quoteFirstPayment } from "./promotion";
import { issueMigrationCode, normalizedPromotionCode, promotionCodeHash } from "../infrastructure/promotion-code";
const future = new Date("2030-01-01T00:00:00Z");
const now = new Date("2026-09-25T12:00:00Z");
test("20% sobre primeira mensalidade ou anuidade, sem reduzir as seguintes", () => {
  assert.deepEqual(quoteFirstPayment(79.99), { originalCents: 7999, discountCents: 1600, firstPaymentCents: 6399, nextPaymentCents: 7999 });
  assert.deepEqual(quoteFirstPayment(1790), { originalCents: 179000, discountCents: 35800, firstPaymentCents: 143200, nextPaymentCents: 179000 });
});
test("cupom tem aleatoriedade, formato e hash; não persiste plaintext", () => {
  const code = issueMigrationCode();
  assert.match(code, /^JPM(?:-[A-F0-9]{4}){6}$/);
  assert.equal(normalizedPromotionCode(code.toLowerCase()), code);
  assert.equal(normalizedPromotionCode("INVALID"), null);
  assert.notEqual(promotionCodeHash(code), code);
  assert.notEqual(issueMigrationCode(), code);
});
test("cupom vinculado não é reutilizável ou aplicável a outro escritório/assinatura", () => {
  const base = { organizationMatches:true,campaign:"LEGACY_MIGRATION",expiresAt: future,redeemedAt:null,revokedAt:null,subscriptionStatus:"pending_verification",cycle:"monthly" as const,now };
  assert.equal(migrationDiscountEligibility(base),true);
  assert.equal(migrationDiscountEligibility({...base,organizationMatches:false}),false);
  assert.equal(migrationDiscountEligibility({...base,redeemedAt:now}),false);
  assert.equal(migrationDiscountEligibility({...base,subscriptionStatus:"active"}),false);
  assert.equal(migrationDiscountEligibility({...base,expiresAt:now}),false);
});
test("piloto temporário expira; não substitui assinatura paga", () => {
  const pilot = {planSlug:"premium",expiresAt:future,revokedAt:null};
  const slugs = ["free","essencial","premium"];
  assert.equal(pilotEntitlement({pilot,status:"pending_verification",now,validPlanSlugs:slugs}),"premium");
  assert.equal(pilotEntitlement({pilot,status:"active",now,validPlanSlugs:slugs}),null);
  assert.equal(pilotEntitlement({pilot:{...pilot,expiresAt:now},status:"pending_verification",now,validPlanSlugs:slugs}),null);
  assert.equal(pilotEntitlement({pilot:{...pilot,revokedAt:now},status:"pending_verification",now,validPlanSlugs:slugs}),null);
});

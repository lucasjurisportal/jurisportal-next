import assert from "node:assert/strict";
import test from "node:test";
import {
  referralEligibility, referralProgress, referralCommissionPreview, qualifiesReferralForReward,
  premiumMonthlyRewardAllowed, REFERRAL_FREE_MONTH_THRESHOLD,
} from "./referrals";
import { issueReferralCode, normalizedReferralCode } from "../infrastructure/referral-code";

const eligible = { referrerUserId: "u-1", invitedOwnerUserId: "u-2", referrerBelongsToInvitedOrg: false,
  invitedOrganizationIsInternal: false, invitedSubscriptionStatus: "pending_verification", alreadyAttributedTo: null,
  cycle: "monthly" as const };

test("código pessoal é fixável no banco, aleatório e reutilizável", () => {
  const code = issueReferralCode();
  assert.match(code, /^JPI(?:-[A-F0-9]{4}){6}$/);
  assert.equal(normalizedReferralCode(` ${code.toLowerCase()} `), code);
  assert.notEqual(issueReferralCode(), code);
});

test("não permite convite anual, da própria equipe, escritório interno ou cliente já ativo", () => {
  assert.equal(referralEligibility(eligible), true);
  assert.equal(referralEligibility({ ...eligible, cycle: "annual" }), false);
  assert.equal(referralEligibility({ ...eligible, invitedOwnerUserId: "u-1" }), false);
  assert.equal(referralEligibility({ ...eligible, referrerBelongsToInvitedOrg: true }), false);
  assert.equal(referralEligibility({ ...eligible, invitedOrganizationIsInternal: true }), false);
  assert.equal(referralEligibility({ ...eligible, invitedSubscriptionStatus: "active" }), false);
});

const paid = new Date("2026-08-01T12:00:00.000Z");
const base = { firstPaidAt: paid, status: "QUALIFIED", revokedAt: null, billingCycle: "monthly",
  subscriptionStatus: "active", canceledAt: null };

test("só conta primeira mensalidade comprovada e 28 dias completos, sem cancelamento", () => {
  const before = new Date("2026-08-29T11:59:59.999Z");
  const at = new Date("2026-08-29T12:00:00.000Z");
  assert.equal(qualifiesReferralForReward(base, before), false);
  assert.equal(qualifiesReferralForReward(base, at), true);
  assert.equal(qualifiesReferralForReward({ ...base, status: "AWAITING_PAYMENT" }, at), false);
  assert.equal(qualifiesReferralForReward({ ...base, status: "PAID_UNDER_REVIEW" }, at), false);
  assert.equal(qualifiesReferralForReward({ ...base, billingCycle: "annual" }, at), false);
  assert.equal(qualifiesReferralForReward({ ...base, subscriptionStatus: "canceled" }, at), false);
  assert.equal(qualifiesReferralForReward({ ...base, canceledAt: new Date() }, at), false);
  assert.equal(qualifiesReferralForReward({ ...base, revokedAt: new Date() }, at), false);
  assert.equal(qualifiesReferralForReward({ ...base, firstPaidAt: null }, at), false);
});

test("mês promocional é exclusivo de Premium mensal ativo, não de Alta Corte ou anual", () => {
  const plan = { planSlug: "premium", billingCycle: "monthly", subscriptionStatus: "active", canceledAt: null };
  assert.equal(premiumMonthlyRewardAllowed(plan), true);
  assert.equal(premiumMonthlyRewardAllowed({ ...plan, planSlug: "alta_corte" }), false);
  assert.equal(premiumMonthlyRewardAllowed({ ...plan, planSlug: "executivo" }), false);
  assert.equal(premiumMonthlyRewardAllowed({ ...plan, billingCycle: "annual" }), false);
  assert.equal(premiumMonthlyRewardAllowed({ ...plan, canceledAt: new Date() }), false);
});

test("três completam a meta Premium; cinco habilitam a apuração, mas não autorizam transferência", () => {
  assert.equal(REFERRAL_FREE_MONTH_THRESHOLD, 3);
  assert.deepEqual(referralProgress(2, true), {
    confirmedFirstPayments: 2, freeMonthEligible: false, cashProgramEligible: false,
    remainingUntilFreeMonth: 1, remainingUntilCash: 3,
  });
  assert.equal(referralProgress(3, true).freeMonthEligible, true);
  assert.equal(referralProgress(3, false).freeMonthEligible, false);
  assert.equal(referralProgress(5, true).cashProgramEligible, true);
  assert.equal(referralProgress(4, true).cashProgramEligible, false);
  assert.equal(referralCommissionPreview(5), 15000);
  assert.equal(referralCommissionPreview(10), 30000);
  assert.throws(() => referralCommissionPreview(-1));
});

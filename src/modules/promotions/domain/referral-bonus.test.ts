import assert from "node:assert/strict";
import test from "node:test";
import { monthlyReferralBonus, saoPauloMonthKey, type BonusEntry } from "./referral-bonus";
const now = new Date("2026-10-06T15:00:00.000Z");
function entry(id: number, props: Partial<BonusEntry> = {}): BonusEntry {
  return { invitedOrganizationId: `org-${id}`, competenceMonth: "2026-09", amountCents: 3000,
    status: "QUALIFIED", eligibleAt: new Date("2026-10-01T03:00:00.000Z"), reversedAt: null,
    activeMonthly: true, ...props };
}

test("virada do mês respeita São Paulo, não UTC", () => {
  assert.equal(saoPauloMonthKey(new Date("2026-10-01T02:59:59.999Z")), "2026-09");
  assert.equal(saoPauloMonthKey(new Date("2026-10-01T03:00:00.000Z")), "2026-10");
});

test("R$30 por mensalidade, sem teto; competência seguinte permite apuração", () => {
  for (const size of [5, 10, 101]) {
    const list = Array.from({ length: size }, (_, id) => entry(id));
    const september = monthlyReferralBonus({ qualifiedReferrals: size, month: "2026-09", entries: list, now: new Date("2026-09-30T23:00:00Z") });
    assert.equal(september.unlocked, true);
    assert.equal(september.monthlyPayments, size);
    assert.equal(september.estimatedCents, size * 3000);
    assert.equal(september.pendingCents, 0); // nunca libera na mesma competência
    const october = monthlyReferralBonus({ qualifiedReferrals: size, month: "2026-10", entries: list, now });
    assert.equal(october.monthlyPayments, 0); // o contador recomeça, não a dívida
    assert.equal(october.estimatedCents, 0);
    assert.equal(october.pendingCents, size * 3000);
  }
});

test("desbloqueio requer cinco indicados qualificados, não cinco cliques ou convites", () => {
  const list = Array.from({ length: 5 }, (_, id) => entry(id));
  assert.equal(monthlyReferralBonus({ qualifiedReferrals: 4, month: "2026-10", entries: list, now }).pendingCents, 0);
  assert.equal(monthlyReferralBonus({ qualifiedReferrals: 5, month: "2026-10", entries: list, now }).pendingCents, 15000);
});

test("duplicações, anualidades, estornos, carência futura e cancelamento não viram repasse", () => {
  const list = [
    entry(1), entry(1),
    entry(2, { status: "REVERSED", reversedAt: now }),
    entry(3, { status: "PENDING_REVIEW" }),
    entry(4, { eligibleAt: new Date("2026-10-07T00:00:00Z") }),
    entry(5, { activeMonthly: false }),
    entry(6, { status: "PAID" }),
  ];
  const result = monthlyReferralBonus({ qualifiedReferrals: 5, month: "2026-10", entries: list, now });
  assert.equal(result.pendingCents, 3000);
  assert.equal(result.alreadyPaidCents, 3000);
  assert.equal(result.monthlyPayments, 0);
});

test("pagamento recente amadurece posteriormente e não desaparece na virada", () => {
  const late = entry(1, { eligibleAt: new Date("2026-10-28T00:00:00Z") });
  const early = monthlyReferralBonus({ qualifiedReferrals: 5, month: "2026-10", entries: [late], now });
  assert.equal(early.pendingCents, 0);
  const matured = monthlyReferralBonus({ qualifiedReferrals: 5, month: "2026-11", entries: [late], now: new Date("2026-11-01T15:00:00Z") });
  assert.equal(matured.pendingCents, 3000);
});

test("valor inválido no lançamento contábil não pode inflar o saldo", () => {
  assert.throws(() => monthlyReferralBonus({ qualifiedReferrals: 5, month: "2026-10", entries: [entry(1, { amountCents: 1200 })], now }), /INVALID_COMMISSION_AMOUNT/);
});

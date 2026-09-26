import assert from "node:assert/strict";
import test from "node:test";
import { aiPeriodKey, assertAiReservationAllowed, calculateAiCreditBalance } from "./ai-credit-policy";
import { AI_MONTHLY_UNIT_LIMIT } from "./ai-policy";
import { planCatalog } from "../../plans/domain/plan.catalog";

const now = new Date("2026-10-01T15:00:00.000Z");
const expiration = new Date("2026-10-01T15:05:00.000Z");

test("créditos mensais são os da matriz mais recente e iguais ao catálogo", () => {
  assert.deepEqual(Object.values(AI_MONTHLY_UNIT_LIMIT), [0, 0, 100, 500, 2000, 5000]);
  for (const plan of planCatalog) assert.equal(plan.internalAi.monthlyUnits, AI_MONTHLY_UNIT_LIMIT[plan.slug]);
});
test("competência usa horário de São Paulo, inclusive meia-noite UTC", () => {
  assert.equal(aiPeriodKey(new Date("2026-10-01T02:59:59.000Z")), "2026-09");
  assert.equal(aiPeriodKey(new Date("2026-10-01T03:00:00.000Z")), "2026-10");
});
test("reserva concorrente diminui disponibilidade e não vira débito até concluir", () => {
  const balance = calculateAiCreditBalance({ planSlug: "estrategico", periodKey: "2026-10", now, records: [
    { status: "SETTLED", reservedCredits: 15, chargedCredits: 12, expiresAt: expiration },
    { status: "RESERVED", reservedCredits: 85, chargedCredits: 0, expiresAt: expiration },
    { status: "REFUNDED", reservedCredits: 5, chargedCredits: 5, expiresAt: expiration },
  ] });
  assert.deepEqual(balance, { periodKey: "2026-10", monthlyLimit: 100, used: 12, reserved: 85, available: 3 });
  assertAiReservationAllowed(balance, 3);
  assert.throws(() => assertAiReservationAllowed(balance, 4), /AI_CREDITS_INSUFFICIENT/);
});
test("reserva vencida não bloqueia saldo; plano sem IA rejeita qualquer custo", () => {
  const expired = calculateAiCreditBalance({ planSlug: "premium", periodKey: "2026-10", now, records: [
    { status: "RESERVED", reservedCredits: 500, chargedCredits: 0, expiresAt: now },
  ] });
  assert.equal(expired.available, 500);
  assert.throws(() => assertAiReservationAllowed(calculateAiCreditBalance({ planSlug: "free", periodKey: "2026-10", now, records: [] }), 1), /AI_PLAN_UNAVAILABLE/);
  assert.throws(() => assertAiReservationAllowed(expired, 0), /AI_CREDITS_INVALID/);
  assert.throws(() => assertAiReservationAllowed(expired, Number.POSITIVE_INFINITY), /AI_CREDITS_INVALID/);
});

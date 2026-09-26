import assert from "node:assert/strict";
import test from "node:test";
import { planCatalog } from "./plan.catalog";
import { hasCapability } from "../application/plan-entitlements";

test("Free: consulta DJeN dentro do sistema sem e-mail, IA ou relatórios", () => {
  const free = planCatalog.find((plan) => plan.slug === "free");
  assert.ok(free);
  assert.equal(free.users, 1);
  assert.equal(free.oabs, 1);
  assert.equal(free.registeredProcessLimit, 10);
  assert.equal(free.monitoredProcessLimit, 10);
  assert.equal(hasCapability(free, "djen.monitoring"), true);
  assert.equal(hasCapability(free, "publications.workflow"), true);
  assert.equal(hasCapability(free, "notifications.email"), false);
  assert.equal(hasCapability(free, "reports.basic"), false);
  assert.equal(hasCapability(free, "ai.publicationSummary"), false);
});

test("planos pagos conservam o envio de publicações por e-mail", () => {
  for (const plan of planCatalog.filter((item) => item.slug !== "free")) {
    assert.equal(hasCapability(plan, "djen.monitoring"), true, plan.slug);
    assert.equal(hasCapability(plan, "notifications.email"), true, plan.slug);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import { resolveReportPeriod } from "./report-period";

test("mês atual usa primeiro dia até hoje em São Paulo", () => {
  const period = resolveReportPeriod({ preset: "month", now: new Date("2026-09-17T18:00:00.000Z") });
  assert.equal(period.from, "2026-09-01");
  assert.equal(period.to, "2026-09-17");
});

test("período customizado troca datas invertidas", () => {
  const period = resolveReportPeriod({ preset: "custom", from: "2026-09-20", to: "2026-09-10", now: new Date("2026-09-17T18:00:00.000Z") });
  assert.equal(period.from, "2026-09-10");
  assert.equal(period.to, "2026-09-20");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_LOGOUT_WINDOW_MS,
  STAFF_ACTIVE_WINDOW_MS,
  STAFF_LOGOUT_WINDOW_MS,
  getLogoutWindowMs,
  resolveInactivityProfile,
  shouldCountAsActive,
} from "./team-activity-policy";

test("proprietário e admin usam política administrativa de 1 hora", () => {
  assert.equal(resolveInactivityProfile("owner"), "ADMIN");
  assert.equal(resolveInactivityProfile("admin"), "ADMIN");
  assert.equal(getLogoutWindowMs("owner"), ADMIN_LOGOUT_WINDOW_MS);
  assert.equal(getLogoutWindowMs("admin"), ADMIN_LOGOUT_WINDOW_MS);
});

test("funcionário usa logout em 30 minutos", () => {
  assert.equal(resolveInactivityProfile("member"), "STAFF");
  assert.equal(getLogoutWindowMs("member"), STAFF_LOGOUT_WINDOW_MS);
});

test("somente funcionário conta atividade e apenas nos primeiros 10 minutos", () => {
  assert.equal(shouldCountAsActive("member", STAFF_ACTIVE_WINDOW_MS - 1), true);
  assert.equal(shouldCountAsActive("member", STAFF_ACTIVE_WINDOW_MS), false);
  assert.equal(shouldCountAsActive("owner", 0), false);
});

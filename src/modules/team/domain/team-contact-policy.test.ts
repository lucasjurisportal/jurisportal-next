import assert from "node:assert/strict";
import test from "node:test";
import { isValidTeamMobile, normalizeTeamMobile } from "./team-contact-policy";

test("celular opcional; número brasileiro com DDD em formato livre", () => {
  assert.equal(isValidTeamMobile(""), true);
  assert.equal(isValidTeamMobile("(11) 99999-9999"), true);
  assert.equal(normalizeTeamMobile("+55 (11) 99999-9999"), "5511999999999");
  assert.equal(isValidTeamMobile("+55 (11) 99999-9999"), true);
});

test("não aceita telefone fixo, números incompletos ou estrangeiros fora do padrão", () => {
  assert.equal(isValidTeamMobile("(11) 3999-9999"), false);
  assert.equal(isValidTeamMobile("99999-9999"), false);
  assert.equal(isValidTeamMobile("(00) 99999-9999"), false);
});

import assert from "node:assert/strict";
import test from "node:test";
import { assertProcessCapacity } from "./process-policy";
import { formatCnjNumber, isStructurallyValidCnj, normalizeCnjDigits } from "./cnj-number";

test("normaliza e mascara CNJ", () => {
  const input = "1000879-08.2014.8.26.0462";
  assert.equal(normalizeCnjDigits(input), "10008790820148260462");
  assert.equal(formatCnjNumber(input), input);
  assert.equal(isStructurallyValidCnj(input), true);
});

test("recusa CNJ com quantidade incorreta de dígitos", () => {
  assert.equal(isStructurallyValidCnj("123"), false);
});

test("bloqueia criação ao atingir limite do plano", () => {
  assert.throws(() => assertProcessCapacity(100, 100), /PROCESS_LIMIT_REACHED/);
  assert.doesNotThrow(() => assertProcessCapacity(99, 100));
  assert.doesNotThrow(() => assertProcessCapacity(99999, "unlimited"));
});

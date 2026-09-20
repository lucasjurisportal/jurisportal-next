import assert from "node:assert/strict";
import test from "node:test";
import { assertCnjMutationAllowed } from "./process-identity-policy";

test("mantém o CNJ quando o valor não mudou", () => {
  assert.equal(assertCnjMutationAllowed({ currentNormalized: "1", requestedNormalized: "1" }), false);
});

test("bloqueia alteração de CNJ para usuário normal", () => {
  assert.throws(() => assertCnjMutationAllowed({ currentNormalized: "1", requestedNormalized: "2" }), /PROCESS_CNJ_LOCKED/);
});

test("administrador mestre precisa informar motivo", () => {
  assert.throws(() => assertCnjMutationAllowed({ currentNormalized: "1", requestedNormalized: "2", allowMasterCorrection: true, correctionReason: "x" }), /PROCESS_CNJ_CHANGE_REASON_REQUIRED/);
});

test("administrador mestre pode corrigir com justificativa", () => {
  assert.equal(assertCnjMutationAllowed({ currentNormalized: "1", requestedNormalized: "2", allowMasterCorrection: true, correctionReason: "Correção após conferência" }), true);
});

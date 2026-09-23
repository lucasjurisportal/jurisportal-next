import assert from "node:assert/strict";
import test from "node:test";
import { scopedProcessWhere } from "./tenant-process-scope";
test("escritórios com mesmo CNJ mantêm escopos de processo distintos", () => {
  const a = scopedProcessWhere("processo-comum", "escritorio-A");
  const b = scopedProcessWhere("processo-comum", "escritorio-B");
  assert.notDeepEqual(a, b);
  assert.equal(a.organizationId, "escritorio-A");
  assert.equal(b.organizationId, "escritorio-B");
});
test("não permite criar filtro de mutação sem organização", () => {
  assert.throws(() => scopedProcessWhere("id", ""), /TENANT_SCOPE_REQUIRED/);
  assert.throws(() => scopedProcessWhere("", "id"), /TENANT_SCOPE_REQUIRED/);
});

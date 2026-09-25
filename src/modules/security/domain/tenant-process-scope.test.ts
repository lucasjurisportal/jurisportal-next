import assert from "node:assert/strict";
import test from "node:test";
import { scopedProcessWhere, scopedRecordWhere } from "./tenant-process-scope";
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


test("mesmo ID não autoriza mutação em outro escritório", () => {
  const a = scopedRecordWhere("registro-comum", "escritorio-A");
  const b = scopedRecordWhere("registro-comum", "escritorio-B");
  assert.notDeepEqual(a, b);
  assert.deepEqual(a, { id: "registro-comum", organizationId: "escritorio-A" });
});

test("o escopo não permite registros ou escritórios vazios", () => {
  assert.throws(() => scopedRecordWhere(" ", "escritorio-A"), /TENANT_SCOPE_REQUIRED/);
  assert.throws(() => scopedRecordWhere("registro", " "), /TENANT_SCOPE_REQUIRED/);
});

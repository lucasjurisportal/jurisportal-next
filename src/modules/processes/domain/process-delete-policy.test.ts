import assert from "node:assert/strict";
import test from "node:test";
import { canPermanentlyDeleteProcess, INTERNAL_ORGANIZATION_SLUG } from "./process-delete-policy";

test("PLATFORM_MASTER pode excluir processo no Jurisportal Internal", () => {
  assert.equal(
    canPermanentlyDeleteProcess({
      isPlatformMaster: true,
      organizationSlug: INTERNAL_ORGANIZATION_SLUG,
    }),
    true,
  );
});

test("PLATFORM_MASTER não pode excluir processo permanentemente em escritório de cliente", () => {
  assert.equal(
    canPermanentlyDeleteProcess({
      isPlatformMaster: true,
      organizationSlug: "escritorio-cliente",
    }),
    false,
  );
});

test("usuário normal não pode excluir processo nem no ambiente interno", () => {
  assert.equal(
    canPermanentlyDeleteProcess({
      isPlatformMaster: false,
      organizationSlug: INTERNAL_ORGANIZATION_SLUG,
    }),
    false,
  );
});

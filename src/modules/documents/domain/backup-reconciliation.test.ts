import assert from "node:assert/strict";
import test from "node:test";
import { canAcknowledgeDeletedMissing, isStagingMissingAcknowledgementAllowed } from "./backup-reconciliation";

test("reconciliação manual é restrita aos buckets e prefixo de staging", () => {
  const staging = { sourceBucket: "jurisportal-staging", backupBucket: "jurisportal-backup", backupPrefix: "staging" };
  assert.equal(isStagingMissingAcknowledgementAllowed(staging), true);
  assert.equal(isStagingMissingAcknowledgementAllowed({ ...staging, backupPrefix: "production" }), false);
  assert.equal(isStagingMissingAcknowledgementAllowed({ ...staging, sourceBucket: "jurisportal-production" }), false);
  assert.equal(isStagingMissingAcknowledgementAllowed({ ...staging, backupBucket: "jurisportal-production-backup" }), false);
});

test("somente DELETED/FAILED/SOURCE_PDF_MISSING admite reconhecimento", () => {
  const missing = { status: "DELETED", backupStatus: "FAILED", backupLastError: "SOURCE_PDF_MISSING" };
  assert.equal(canAcknowledgeDeletedMissing(missing), true);
  assert.equal(canAcknowledgeDeletedMissing({ ...missing, status: "ACTIVE" }), false);
  assert.equal(canAcknowledgeDeletedMissing({ ...missing, backupStatus: "VERIFIED" }), false);
  assert.equal(canAcknowledgeDeletedMissing({ ...missing, backupLastError: "R2_MAIN_READ_403" }), false);
  assert.equal(canAcknowledgeDeletedMissing({ ...missing, backupLastError: null }), false);
});

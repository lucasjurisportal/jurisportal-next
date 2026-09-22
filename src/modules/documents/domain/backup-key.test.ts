import assert from "node:assert/strict";
import test from "node:test";
import { getR2BackupKey, isR2BackupConfigured, presignR2 } from "../infrastructure/r2-storage";

const envNames = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_BACKUP_ACCESS_KEY_ID", "R2_BACKUP_SECRET_ACCESS_KEY", "R2_BACKUP_BUCKET", "R2_BACKUP_PREFIX", "R2_BACKUP_ACCOUNT_ID", "R2_ENDPOINT", "R2_BACKUP_ENDPOINT"] as const;
const old = Object.fromEntries(envNames.map((key) => [key, process.env[key]]));

test("backup usa bucket e credenciais separados, sem expor segredos na URL", () => {
  try {
    Object.assign(process.env, {
      R2_ACCOUNT_ID: "a".repeat(32), R2_ACCESS_KEY_ID: "MAINKEY", R2_SECRET_ACCESS_KEY: "main-secret",
      R2_BUCKET: "jurisportal-staging", R2_BACKUP_ACCESS_KEY_ID: "BACKUPKEY",
      R2_BACKUP_SECRET_ACCESS_KEY: "backup-secret", R2_BACKUP_BUCKET: "jurisportal-backup",
      R2_BACKUP_PREFIX: "staging",
    });
    assert.equal(isR2BackupConfigured(), true);
    const key = getR2BackupKey("organizations/a/processes/b/documents/c.pdf");
    assert.equal(key, "staging/jurisportal-staging/organizations/a/processes/b/documents/c.pdf");
    const url = presignR2("PUT", key, 60, "backup");
    assert.match(url, /jurisportal-backup/);
    assert.match(url, /BACKUPKEY/);
    assert.doesNotMatch(url, /MAINKEY|backup-secret|main-secret/);
    process.env.R2_BACKUP_BUCKET = "jurisportal-staging";
    assert.throws(() => presignR2("PUT", key, 60, "backup"), /R2_BACKUP_MUST_USE_SEPARATE_BUCKET/);
    assert.throws(() => getR2BackupKey("../outro-tenant.pdf"), /R2_BACKUP_INVALID_SOURCE_KEY/);
  } finally {
    for (const name of envNames) {
      if (old[name] === undefined) delete process.env[name];
      else process.env[name] = old[name];
    }
  }
});

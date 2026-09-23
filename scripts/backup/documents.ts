import { config } from "dotenv";
config({ path: [".env.local", ".env"], quiet: true });

// Importação tardia: a conexão Prisma deve ser construída DEPOIS de carregar o env local.
async function main() {
  const { prisma } = await import("../../src/infrastructure/database/prisma");
  try {
    const { backupPendingDocuments, restoreDocumentFromBackup, acknowledgeMissingDeletedStagingDocument } = await import("../../src/modules/documents/application/document-backup-service");
    const restore = process.argv.find((arg) => arg.startsWith("--restore="));
    const acknowledge = process.argv.find((arg) => arg.startsWith("--acknowledge-missing="));
    if (restore && acknowledge) throw new Error("CHOOSE_ONE_BACKUP_OPERATION");
    if (acknowledge) {
      const id = acknowledge.split("=")[1];
      if (!/^[a-f\d]{8}-[a-f\d-]{27,}$/i.test(id)) throw new Error("DOCUMENT_ID_INVALID");
      if (!process.argv.includes("--confirm-acknowledge-missing")) {
        throw new Error("PASS_--confirm-acknowledge-missing_TO_ACKNOWLEDGE_STAGING_LOSS");
      }
      console.log("[documents.backup.acknowledgement]", JSON.stringify(await acknowledgeMissingDeletedStagingDocument(id)));
    } else if (restore) {
      const id = restore.split("=")[1];
      if (!/^[a-f\d]{8}-[a-f\d-]{27,}$/i.test(id)) throw new Error("DOCUMENT_ID_INVALID");
      if (!process.argv.includes("--confirm-restore")) throw new Error("PASS_--confirm-restore_TO_RESTORE");
      if (!process.env.R2_BUCKET?.includes("staging") && process.env.BACKUP_ALLOW_PRODUCTION_RESTORE !== "true") {
        throw new Error("PRODUCTION_RESTORE_DISABLED");
      }
      console.log(await restoreDocumentFromBackup(id));
    } else {
      const all = process.argv.includes("--all");
      const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
      const limit = limitArg ? Number(limitArg.split("=")[1]) : 5;
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 10) throw new Error("BACKUP_LIMIT_INVALID");
      // --all drena até 200 PDFs por execução, em lotes pequenos e com limite de tempo no runner.
      // Um documento com erro não interrompe o processamento dos demais.
      const maxBatches = all ? 20 : 1;
      let attempted = 0;
      let verified = 0;
      let failed = 0;
      let remaining = { pending: 0, copying: 0, failed: 0, acknowledgedMissing: 0 };
      for (let batch = 0; batch < maxBatches; batch++) {
        const result = await backupPendingDocuments(all ? 10 : limit);
        attempted += result.attempted;
        verified += result.verified;
        failed += result.failed;
        remaining = result.remaining;
        if (!all || result.attempted === 0 || (remaining.pending === 0 && remaining.copying === 0)) break;
      }
      console.log("[documents.backup.summary]", JSON.stringify({ attempted, verified, failed, remaining }));
      if (remaining.acknowledgedMissing > 0) {
        // Aviso persistente, sem mascarar o fato de que esses PDFs NUNCA foram protegidos.
        console.warn(`::warning::${remaining.acknowledgedMissing} PDF(s) DELETED de staging com perda reconhecida manualmente; metadados e quota preservados.`);
      }
      // Não declarar backup bem-sucedido se algum objeto recuperável não foi protegido.
      // SOURCE_PDF_MISSING deve permanecer visível no GitHub Actions até ser investigado.
      if (failed > 0 || remaining.pending > 0 || remaining.copying > 0 || remaining.failed > 0) {
        process.exitCode = 1;
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error: unknown) => {
  console.error("[documents.backup.script]", error instanceof Error ? error.message : "FAILED");
  process.exitCode = 1;
});

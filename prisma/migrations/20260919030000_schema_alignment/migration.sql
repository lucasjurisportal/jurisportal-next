-- AlterTable
ALTER TABLE "petition_generation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "process_number_sequence" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "team_member_profile" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "external_calendar_event_link_provider_organizationId_sourceType" RENAME TO "external_calendar_event_link_provider_organizationId_source_key";

-- RenameIndex
ALTER INDEX "process_work_item_organizationId_responsibleUserId_status_dueDa" RENAME TO "process_work_item_organizationId_responsibleUserId_status_d_idx";

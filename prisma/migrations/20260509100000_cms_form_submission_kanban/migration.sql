-- AlterTable
ALTER TABLE "CmsFormSubmission" ADD COLUMN "kanbanColumnKey" TEXT NOT NULL DEFAULT 'new';

-- AlterTable
ALTER TABLE "CmsSite" ADD COLUMN "formSubmissionKanbanColumns" JSONB;

-- CreateIndex
CREATE INDEX "CmsFormSubmission_siteId_kanbanColumnKey_idx" ON "CmsFormSubmission"("siteId", "kanbanColumnKey");

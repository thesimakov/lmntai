-- AlterTable
ALTER TABLE "CmsPageRevision" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProjectSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "sandboxHtml" TEXT NOT NULL,
    "sandboxCss" TEXT NOT NULL DEFAULT '',
    "sandboxId" TEXT,
    "versionNum" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDeliveryLog" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "httpStatus" INTEGER,
    "error" TEXT,
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectSnapshot_projectId_createdAt_idx" ON "ProjectSnapshot"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_siteId_createdAt_idx" ON "WebhookDeliveryLog"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "WebhookDeliveryLog_status_nextRetryAt_idx" ON "WebhookDeliveryLog"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "CmsPageRevision_pageId_deletedAt_idx" ON "CmsPageRevision"("pageId", "deletedAt");

-- AddForeignKey
ALTER TABLE "ProjectSnapshot" ADD CONSTRAINT "ProjectSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

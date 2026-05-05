-- CreateTable
CREATE TABLE "CmsFormSubmission" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pageId" TEXT,
    "pagePath" TEXT,
    "formName" TEXT,
    "fields" JSONB NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsFormSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CmsFormSubmission_siteId_createdAt_idx" ON "CmsFormSubmission"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "CmsFormSubmission_pageId_createdAt_idx" ON "CmsFormSubmission"("pageId", "createdAt");

-- AddForeignKey
ALTER TABLE "CmsFormSubmission" ADD CONSTRAINT "CmsFormSubmission_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsFormSubmission" ADD CONSTRAINT "CmsFormSubmission_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CMS core: site/page/revision/content types/headless entries/media/publish jobs.

-- CreateTable
CREATE TABLE "CmsSite" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultLocale" TEXT NOT NULL DEFAULT 'ru',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsSiteMember" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsSiteMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPage" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'page',
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "draftRevisionId" TEXT,
    "publishedRevisionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPageRevision" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "label" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsPageRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsContentType" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContentType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsContentField" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "contentTypeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsContentField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsEntry" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "contentTypeId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "draftVersionId" TEXT,
    "publishedVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsEntryVersion" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CmsEntryVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsMediaAsset" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "alt" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CmsMediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CmsPublishJob" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "createdById" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "snapshot" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "CmsPublishJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CmsSite_projectId_key" ON "CmsSite"("projectId");

-- CreateIndex
CREATE INDEX "CmsSite_ownerId_updatedAt_idx" ON "CmsSite"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsSiteMember_siteId_userId_key" ON "CmsSiteMember"("siteId", "userId");

-- CreateIndex
CREATE INDEX "CmsSiteMember_userId_updatedAt_idx" ON "CmsSiteMember"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_siteId_path_key" ON "CmsPage"("siteId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_draftRevisionId_key" ON "CmsPage"("draftRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPage_publishedRevisionId_key" ON "CmsPage"("publishedRevisionId");

-- CreateIndex
CREATE INDEX "CmsPage_siteId_parentId_sortOrder_idx" ON "CmsPage"("siteId", "parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "CmsPage_siteId_updatedAt_idx" ON "CmsPage"("siteId", "updatedAt");

-- CreateIndex
CREATE INDEX "CmsPage_siteId_isHome_idx" ON "CmsPage"("siteId", "isHome");

-- CreateIndex
CREATE UNIQUE INDEX "CmsPageRevision_pageId_version_key" ON "CmsPageRevision"("pageId", "version");

-- CreateIndex
CREATE INDEX "CmsPageRevision_pageId_createdAt_idx" ON "CmsPageRevision"("pageId", "createdAt");

-- CreateIndex
CREATE INDEX "CmsPageRevision_siteId_status_createdAt_idx" ON "CmsPageRevision"("siteId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentType_siteId_apiKey_key" ON "CmsContentType"("siteId", "apiKey");

-- CreateIndex
CREATE INDEX "CmsContentType_ownerId_updatedAt_idx" ON "CmsContentType"("ownerId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsContentField_contentTypeId_key_key" ON "CmsContentField"("contentTypeId", "key");

-- CreateIndex
CREATE INDEX "CmsContentField_siteId_contentTypeId_sortOrder_idx" ON "CmsContentField"("siteId", "contentTypeId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "CmsEntry_siteId_contentTypeId_slug_key" ON "CmsEntry"("siteId", "contentTypeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "CmsEntry_draftVersionId_key" ON "CmsEntry"("draftVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "CmsEntry_publishedVersionId_key" ON "CmsEntry"("publishedVersionId");

-- CreateIndex
CREATE INDEX "CmsEntry_siteId_updatedAt_idx" ON "CmsEntry"("siteId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsEntryVersion_entryId_version_key" ON "CmsEntryVersion"("entryId", "version");

-- CreateIndex
CREATE INDEX "CmsEntryVersion_siteId_status_createdAt_idx" ON "CmsEntryVersion"("siteId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CmsMediaAsset_siteId_assetKey_key" ON "CmsMediaAsset"("siteId", "assetKey");

-- CreateIndex
CREATE INDEX "CmsMediaAsset_siteId_createdAt_idx" ON "CmsMediaAsset"("siteId", "createdAt");

-- CreateIndex
CREATE INDEX "CmsPublishJob_siteId_createdAt_idx" ON "CmsPublishJob"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "CmsSite" ADD CONSTRAINT "CmsSite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSite" ADD CONSTRAINT "CmsSite_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSiteMember" ADD CONSTRAINT "CmsSiteMember_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsSiteMember" ADD CONSTRAINT "CmsSiteMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CmsPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_draftRevisionId_fkey" FOREIGN KEY ("draftRevisionId") REFERENCES "CmsPageRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPage" ADD CONSTRAINT "CmsPage_publishedRevisionId_fkey" FOREIGN KEY ("publishedRevisionId") REFERENCES "CmsPageRevision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageRevision" ADD CONSTRAINT "CmsPageRevision_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "CmsPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageRevision" ADD CONSTRAINT "CmsPageRevision_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPageRevision" ADD CONSTRAINT "CmsPageRevision_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsContentType" ADD CONSTRAINT "CmsContentType_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsContentType" ADD CONSTRAINT "CmsContentType_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsContentField" ADD CONSTRAINT "CmsContentField_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsContentField" ADD CONSTRAINT "CmsContentField_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "CmsContentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_contentTypeId_fkey" FOREIGN KEY ("contentTypeId") REFERENCES "CmsContentType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_draftVersionId_fkey" FOREIGN KEY ("draftVersionId") REFERENCES "CmsEntryVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntry" ADD CONSTRAINT "CmsEntry_publishedVersionId_fkey" FOREIGN KEY ("publishedVersionId") REFERENCES "CmsEntryVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntryVersion" ADD CONSTRAINT "CmsEntryVersion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "CmsEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntryVersion" ADD CONSTRAINT "CmsEntryVersion_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsEntryVersion" ADD CONSTRAINT "CmsEntryVersion_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsMediaAsset" ADD CONSTRAINT "CmsMediaAsset_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsMediaAsset" ADD CONSTRAINT "CmsMediaAsset_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPublishJob" ADD CONSTRAINT "CmsPublishJob_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "CmsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CmsPublishJob" ADD CONSTRAINT "CmsPublishJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

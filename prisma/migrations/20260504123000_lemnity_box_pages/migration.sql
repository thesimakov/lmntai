-- AlterTable
ALTER TABLE "Project" ADD COLUMN "editorType" TEXT NOT NULL DEFAULT 'AI';

-- CreateTable
CREATE TABLE "LemnityBoxPage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LemnityBoxPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LemnityBoxPage_projectId_key" ON "LemnityBoxPage"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "LemnityBoxPage_ownerId_slug_key" ON "LemnityBoxPage"("ownerId", "slug");

-- CreateIndex
CREATE INDEX "LemnityBoxPage_ownerId_updatedAt_idx" ON "LemnityBoxPage"("ownerId", "updatedAt");

-- AddForeignKey
ALTER TABLE "LemnityBoxPage" ADD CONSTRAINT "LemnityBoxPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LemnityBoxPage" ADD CONSTRAINT "LemnityBoxPage_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

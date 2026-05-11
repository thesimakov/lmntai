-- AlterTable
ALTER TABLE "CmsPage" ADD COLUMN     "seoKeywords" TEXT,
ADD COLUMN     "seoCanonicalUrl" TEXT,
ADD COLUMN     "seoNoFollow" BOOLEAN NOT NULL DEFAULT false;

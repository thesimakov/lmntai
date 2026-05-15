-- CreateTable
CREATE TABLE "AnalyticsChunkEmbedding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "chunkText" TEXT NOT NULL,
    "vector" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsChunkEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsChunkEmbedding_projectId_idx" ON "AnalyticsChunkEmbedding"("projectId");

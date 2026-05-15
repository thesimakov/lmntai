-- CreateTable
CREATE TABLE "AnalyticsShare" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "label" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsShare_token_key" ON "AnalyticsShare"("token");

-- CreateIndex
CREATE INDEX "AnalyticsShare_projectId_idx" ON "AnalyticsShare"("projectId");

-- CreateIndex
CREATE INDEX "AnalyticsShare_token_idx" ON "AnalyticsShare"("token");

-- AddForeignKey
ALTER TABLE "AnalyticsShare" ADD CONSTRAINT "AnalyticsShare_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserVirtualWorkspace" (
    "userId" TEXT NOT NULL,
    "limitBytes" BIGINT NOT NULL DEFAULT 1073741824,
    "usedBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserVirtualWorkspace_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserVirtualEntry" (
    "id" TEXT NOT NULL,
    "workspaceUserId" TEXT NOT NULL,
    "virtualPath" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'request',
    "content" JSONB NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserVirtualEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserVirtualEntry_workspaceUserId_createdAt_idx" ON "UserVirtualEntry"("workspaceUserId", "createdAt");

-- CreateIndex
CREATE INDEX "UserVirtualEntry_kind_createdAt_idx" ON "UserVirtualEntry"("kind", "createdAt");

-- AddForeignKey
ALTER TABLE "UserVirtualWorkspace" ADD CONSTRAINT "UserVirtualWorkspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserVirtualEntry" ADD CONSTRAINT "UserVirtualEntry_workspaceUserId_fkey" FOREIGN KEY ("workspaceUserId") REFERENCES "UserVirtualWorkspace"("userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill workspace rows for existing users.
INSERT INTO "UserVirtualWorkspace" ("userId", "limitBytes", "usedBytes", "createdAt", "updatedAt")
SELECT "id", 1073741824, 0, NOW(), NOW() FROM "User"
ON CONFLICT ("userId") DO NOTHING;

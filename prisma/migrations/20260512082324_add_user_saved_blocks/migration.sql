-- CreateTable
CREATE TABLE "UserSavedBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamProjectId" TEXT,
    "name" TEXT NOT NULL,
    "blockType" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "cssContent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSavedBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSavedBlock_userId_idx" ON "UserSavedBlock"("userId");

-- CreateIndex
CREATE INDEX "UserSavedBlock_teamProjectId_idx" ON "UserSavedBlock"("teamProjectId");

-- AddForeignKey
ALTER TABLE "UserSavedBlock" ADD CONSTRAINT "UserSavedBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

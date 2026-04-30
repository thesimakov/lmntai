-- CreateTable
CREATE TABLE "SandboxProjectState" (
    "sandboxId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxProjectState_pkey" PRIMARY KEY ("sandboxId")
);

-- CreateIndex
CREATE INDEX "SandboxProjectState_ownerId_updatedAt_idx" ON "SandboxProjectState"("ownerId", "updatedAt");

-- AddForeignKey
ALTER TABLE "SandboxProjectState" ADD CONSTRAINT "SandboxProjectState_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

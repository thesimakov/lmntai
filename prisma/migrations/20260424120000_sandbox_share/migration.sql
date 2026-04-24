-- Публичная ссылка на превью /share/:sandboxId (совместимо с upstream session share)
CREATE TABLE "SandboxShare" (
    "id" TEXT NOT NULL,
    "sandboxId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxShare_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SandboxShare_sandboxId_key" ON "SandboxShare"("sandboxId");
CREATE INDEX "SandboxShare_ownerId_idx" ON "SandboxShare"("ownerId");

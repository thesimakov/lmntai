-- CreateTable
CREATE TABLE "PublishDomainBinding" (
    "id" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "sandboxId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "lastVerificationAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishDomainBinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublishDomainBinding_host_key" ON "PublishDomainBinding"("host");

-- CreateIndex
CREATE INDEX "PublishDomainBinding_ownerId_sandboxId_idx" ON "PublishDomainBinding"("ownerId", "sandboxId");

-- CreateIndex
CREATE INDEX "PublishDomainBinding_sandboxId_isActive_idx" ON "PublishDomainBinding"("sandboxId", "isActive");

-- AddForeignKey
ALTER TABLE "PublishDomainBinding" ADD CONSTRAINT "PublishDomainBinding_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

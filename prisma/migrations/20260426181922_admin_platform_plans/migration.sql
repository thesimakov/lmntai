-- AlterTable
ALTER TABLE "ReferralWallet" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "adminPermissions" JSONB,
ADD COLUMN     "createdByAdminId" TEXT;

-- CreateTable
CREATE TABLE "PlatformPlanSettings" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformPlanSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_createdByAdminId_idx" ON "User"("createdByAdminId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_createdByAdminId_fkey" FOREIGN KEY ("createdByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

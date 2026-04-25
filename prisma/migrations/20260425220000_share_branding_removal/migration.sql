-- AlterTable
ALTER TABLE "SandboxShare" ADD COLUMN "hideLemnityHeader" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "shareBrandingRemovalPaidAt" TIMESTAMP(3);

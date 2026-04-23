-- AlterTable
ALTER TABLE "TeamInvitation" ADD COLUMN "invitedUserId" TEXT;
ALTER TABLE "TeamInvitation" ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill
UPDATE "TeamInvitation"
SET
  "email" = LOWER(TRIM("email")),
  "updatedAt" = COALESCE("updatedAt", "createdAt", CURRENT_TIMESTAMP);

-- Ensure updatedAt is required
ALTER TABLE "TeamInvitation" ALTER COLUMN "updatedAt" SET NOT NULL;

-- Deduplicate before unique constraint
DELETE FROM "TeamInvitation" AS t
USING (
  SELECT
    ctid,
    ROW_NUMBER() OVER (PARTITION BY "userId", "email" ORDER BY "createdAt" DESC) AS rn
  FROM "TeamInvitation"
) AS dedup
WHERE t.ctid = dedup.ctid
  AND dedup.rn > 1;

-- Indexes
CREATE UNIQUE INDEX "TeamInvitation_userId_email_key" ON "TeamInvitation"("userId", "email");
CREATE INDEX "TeamInvitation_userId_status_idx" ON "TeamInvitation"("userId", "status");
CREATE INDEX "TeamInvitation_invitedUserId_idx" ON "TeamInvitation"("invitedUserId");

-- Foreign key
ALTER TABLE "TeamInvitation"
ADD CONSTRAINT "TeamInvitation_invitedUserId_fkey"
FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

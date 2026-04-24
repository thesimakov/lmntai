-- CreateTable
CREATE TABLE "ManusSessionLink" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "manusSessionId" TEXT NOT NULL,
  "title" TEXT,
  "latestMessage" TEXT,
  "latestMessageAt" TIMESTAMP(3),
  "unreadMessageCount" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ManusSessionLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManusChatCharge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "manusSessionId" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "promptTokens" INTEGER NOT NULL,
  "completionTokens" INTEGER NOT NULL,
  "totalTokens" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManusChatCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ManusSessionLink_manusSessionId_key" ON "ManusSessionLink"("manusSessionId");
CREATE INDEX "ManusSessionLink_userId_updatedAt_idx" ON "ManusSessionLink"("userId", "updatedAt");
CREATE UNIQUE INDEX "ManusChatCharge_manusSessionId_eventId_key" ON "ManusChatCharge"("manusSessionId", "eventId");
CREATE INDEX "ManusChatCharge_userId_createdAt_idx" ON "ManusChatCharge"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ManusSessionLink"
ADD CONSTRAINT "ManusSessionLink_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManusChatCharge"
ADD CONSTRAINT "ManusChatCharge_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

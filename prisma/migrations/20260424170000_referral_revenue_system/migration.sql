ALTER TABLE "User"
ADD COLUMN "isPartner" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "partnerApprovedAt" TIMESTAMP(3),
ADD COLUMN "partnerApprovedById" TEXT;

CREATE INDEX "User_partnerApprovedById_idx" ON "User"("partnerApprovedById");

ALTER TABLE "User"
ADD CONSTRAINT "User_partnerApprovedById_fkey"
FOREIGN KEY ("partnerApprovedById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE TABLE "ReferralWallet" (
    "userId" TEXT NOT NULL,
    "availableRubMinor" INTEGER NOT NULL DEFAULT 0,
    "availableTjsMinor" INTEGER NOT NULL DEFAULT 0,
    "availableUsdMinor" INTEGER NOT NULL DEFAULT 0,
    "lifetimeRubMinor" INTEGER NOT NULL DEFAULT 0,
    "lifetimeTjsMinor" INTEGER NOT NULL DEFAULT 0,
    "lifetimeUsdMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralWallet_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "ReferralWallet"
ADD CONSTRAINT "ReferralWallet_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE TABLE "ReferralEarning" (
    "id" TEXT NOT NULL,
    "referrerId" TEXT NOT NULL,
    "referredUserId" TEXT NOT NULL,
    "paymentEventId" TEXT NOT NULL,
    "paymentId" TEXT,
    "planId" TEXT,
    "sourceAmountMinor" INTEGER NOT NULL,
    "sourceCurrency" TEXT NOT NULL,
    "rewardAmountMinor" INTEGER NOT NULL,
    "rewardCurrency" TEXT NOT NULL,
    "rateUsed" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEarning_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReferralEarning_paymentEventId_key" ON "ReferralEarning"("paymentEventId");
CREATE INDEX "ReferralEarning_referrerId_createdAt_idx" ON "ReferralEarning"("referrerId", "createdAt");
CREATE INDEX "ReferralEarning_referredUserId_createdAt_idx" ON "ReferralEarning"("referredUserId", "createdAt");

ALTER TABLE "ReferralEarning"
ADD CONSTRAINT "ReferralEarning_referrerId_fkey"
FOREIGN KEY ("referrerId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "ReferralEarning"
ADD CONSTRAINT "ReferralEarning_referredUserId_fkey"
FOREIGN KEY ("referredUserId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE TABLE "ReferralWalletEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralWalletEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferralWalletEntry_userId_createdAt_idx" ON "ReferralWalletEntry"("userId", "createdAt");
CREATE INDEX "ReferralWalletEntry_sourceType_sourceId_idx" ON "ReferralWalletEntry"("sourceType", "sourceId");

ALTER TABLE "ReferralWalletEntry"
ADD CONSTRAINT "ReferralWalletEntry_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewNote" TEXT,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WithdrawalRequest_userId_createdAt_idx" ON "WithdrawalRequest"("userId", "createdAt");
CREATE INDEX "WithdrawalRequest_status_createdAt_idx" ON "WithdrawalRequest"("status", "createdAt");
CREATE INDEX "WithdrawalRequest_reviewedById_idx" ON "WithdrawalRequest"("reviewedById");

ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "WithdrawalRequest"
ADD CONSTRAINT "WithdrawalRequest_reviewedById_fkey"
FOREIGN KEY ("reviewedById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserBrandKitLibrary" (
    "userId" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBrandKitLibrary_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "UserBrandKitLibrary" ADD CONSTRAINT "UserBrandKitLibrary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

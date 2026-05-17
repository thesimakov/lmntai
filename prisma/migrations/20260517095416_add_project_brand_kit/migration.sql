-- CreateTable
CREATE TABLE "ProjectBrandKit" (
    "projectId" TEXT NOT NULL,
    "manifest" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBrandKit_pkey" PRIMARY KEY ("projectId")
);

-- AddForeignKey
ALTER TABLE "ProjectBrandKit" ADD CONSTRAINT "ProjectBrandKit_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

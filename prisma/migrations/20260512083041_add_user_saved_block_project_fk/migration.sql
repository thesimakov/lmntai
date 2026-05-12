-- AddForeignKey
ALTER TABLE "UserSavedBlock" ADD CONSTRAINT "UserSavedBlock_teamProjectId_fkey" FOREIGN KEY ("teamProjectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

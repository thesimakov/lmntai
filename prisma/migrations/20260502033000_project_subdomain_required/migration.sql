ALTER TABLE "Project" ADD COLUMN "subdomain" TEXT;

UPDATE "Project"
SET "subdomain" = CONCAT('project-', LOWER(SUBSTRING("id" FROM 1 FOR 10)))
WHERE "subdomain" IS NULL OR LENGTH(TRIM("subdomain")) = 0;

ALTER TABLE "Project" ALTER COLUMN "subdomain" SET NOT NULL;

CREATE UNIQUE INDEX "Project_subdomain_key" ON "Project"("subdomain");

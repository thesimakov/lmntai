-- Project root aggregate for hard isolation
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Project_ownerId_updatedAt_idx" ON "Project"("ownerId", "updatedAt");

ALTER TABLE "SandboxProjectState" ADD COLUMN "projectId" TEXT;
ALTER TABLE "SandboxShare" ADD COLUMN "projectId" TEXT;
ALTER TABLE "PublishDomainBinding" ADD COLUMN "projectId" TEXT;
ALTER TABLE "ManusSessionLink" ADD COLUMN "projectId" TEXT;
ALTER TABLE "ManusChatCharge" ADD COLUMN "projectId" TEXT;
ALTER TABLE "TokenUsageLog" ADD COLUMN "projectId" TEXT;
ALTER TABLE "UserVirtualEntry" ADD COLUMN "projectId" TEXT;

INSERT INTO "Project" ("id", "ownerId", "name", "createdAt", "updatedAt")
SELECT s."sandboxId", s."ownerId", s."title", s."createdAt", s."updatedAt"
FROM "SandboxProjectState" s
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Project" ("id", "ownerId", "name", "createdAt", "updatedAt")
SELECT ss."sandboxId", ss."ownerId", 'Imported shared project', ss."createdAt", ss."updatedAt"
FROM "SandboxShare" ss
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Project" ("id", "ownerId", "name", "createdAt", "updatedAt")
SELECT p."sandboxId", p."ownerId", 'Imported published project', p."createdAt", p."updatedAt"
FROM "PublishDomainBinding" p
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "Project" ("id", "ownerId", "name", "createdAt", "updatedAt")
SELECT m."manusSessionId", m."userId", COALESCE(NULLIF(m."title", ''), 'Lemnity AI Session'), m."createdAt", m."updatedAt"
FROM "ManusSessionLink" m
ON CONFLICT ("id") DO NOTHING;

-- Иначе projectId = manusSessionId не находится в Project и FK ManusChatCharge_projectId_fkey падает.
DELETE FROM "ManusChatCharge" c
WHERE NOT EXISTS (
  SELECT 1 FROM "ManusSessionLink" m WHERE m."manusSessionId" = c."manusSessionId"
);

UPDATE "SandboxProjectState" SET "projectId" = "sandboxId" WHERE "projectId" IS NULL;
UPDATE "SandboxShare" SET "projectId" = "sandboxId" WHERE "projectId" IS NULL;
UPDATE "PublishDomainBinding" SET "projectId" = "sandboxId" WHERE "projectId" IS NULL;
UPDATE "ManusSessionLink" SET "projectId" = "manusSessionId" WHERE "projectId" IS NULL;
UPDATE "ManusChatCharge" SET "projectId" = "manusSessionId" WHERE "projectId" IS NULL;

ALTER TABLE "SandboxProjectState" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "SandboxShare" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "PublishDomainBinding" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "ManusSessionLink" ALTER COLUMN "projectId" SET NOT NULL;
ALTER TABLE "ManusChatCharge" ALTER COLUMN "projectId" SET NOT NULL;

CREATE UNIQUE INDEX "SandboxProjectState_projectId_key" ON "SandboxProjectState"("projectId");
CREATE INDEX "SandboxProjectState_projectId_updatedAt_idx" ON "SandboxProjectState"("projectId", "updatedAt");

CREATE UNIQUE INDEX "SandboxShare_projectId_key" ON "SandboxShare"("projectId");

CREATE INDEX "PublishDomainBinding_projectId_isActive_idx" ON "PublishDomainBinding"("projectId", "isActive");

CREATE UNIQUE INDEX "ManusSessionLink_projectId_key" ON "ManusSessionLink"("projectId");
CREATE INDEX "ManusSessionLink_projectId_updatedAt_idx" ON "ManusSessionLink"("projectId", "updatedAt");

CREATE UNIQUE INDEX "ManusChatCharge_projectId_eventId_key" ON "ManusChatCharge"("projectId", "eventId");
CREATE INDEX "ManusChatCharge_projectId_createdAt_idx" ON "ManusChatCharge"("projectId", "createdAt");

CREATE INDEX "TokenUsageLog_projectId_createdAt_idx" ON "TokenUsageLog"("projectId", "createdAt");
CREATE INDEX "UserVirtualEntry_projectId_createdAt_idx" ON "UserVirtualEntry"("projectId", "createdAt");

CREATE TABLE "ProjectImageAsset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "assetKey" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "bytes" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectImageAsset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectImageAsset_projectId_assetKey_key" ON "ProjectImageAsset"("projectId", "assetKey");
CREATE INDEX "ProjectImageAsset_projectId_createdAt_idx" ON "ProjectImageAsset"("projectId", "createdAt");

CREATE TABLE "ProjectMessage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectMessage_projectId_createdAt_idx" ON "ProjectMessage"("projectId", "createdAt");

CREATE TABLE "ProjectEmbedding" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "namespace" TEXT NOT NULL,
    "vectorRef" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectEmbedding_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectEmbedding_projectId_createdAt_idx" ON "ProjectEmbedding"("projectId", "createdAt");
CREATE INDEX "ProjectEmbedding_projectId_namespace_idx" ON "ProjectEmbedding"("projectId", "namespace");

CREATE TABLE "ProjectActionLog" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProjectActionLog_projectId_createdAt_idx" ON "ProjectActionLog"("projectId", "createdAt");
CREATE INDEX "ProjectActionLog_action_createdAt_idx" ON "ProjectActionLog"("action", "createdAt");

ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SandboxProjectState" ADD CONSTRAINT "SandboxProjectState_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SandboxShare" ADD CONSTRAINT "SandboxShare_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PublishDomainBinding" ADD CONSTRAINT "PublishDomainBinding_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManusSessionLink" ADD CONSTRAINT "ManusSessionLink_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ManusChatCharge" ADD CONSTRAINT "ManusChatCharge_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectImageAsset" ADD CONSTRAINT "ProjectImageAsset_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMessage" ADD CONSTRAINT "ProjectMessage_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectEmbedding" ADD CONSTRAINT "ProjectEmbedding_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectActionLog" ADD CONSTRAINT "ProjectActionLog_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TokenUsageLog" ADD CONSTRAINT "TokenUsageLog_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserVirtualEntry" ADD CONSTRAINT "UserVirtualEntry_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

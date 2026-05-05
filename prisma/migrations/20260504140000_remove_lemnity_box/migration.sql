-- Remove Lemnity Box data and schema (BOX projects cascade-delete LemnityBoxPage rows).
DELETE FROM "Project" WHERE "editorType" = 'BOX';

DROP TABLE IF EXISTS "LemnityBoxPage";

ALTER TABLE "Project" DROP COLUMN IF EXISTS "editorType";

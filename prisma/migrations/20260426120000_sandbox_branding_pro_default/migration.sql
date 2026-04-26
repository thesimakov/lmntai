-- Pro/Team: по умолчанию брендинг выключен (как в проде до опции «включить»); сохраняем для существующих владельцев.
UPDATE "SandboxShare" s
SET "hideLemnityHeader" = true
FROM "User" u
WHERE s."ownerId" = u.id
  AND u."plan"::text IN ('PRO', 'TEAM', 'BUSINESS');

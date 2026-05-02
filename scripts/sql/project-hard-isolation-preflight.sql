-- Выполнять на production Postgres ПЕРВЫМ разом, если migrate deploy падает на
-- 20260502030000_project_hard_isolation (часто из-за FK Project ← ManusChatCharge).
-- После правок данных:
--   npx prisma migrate resolve --rolled-back 20260502030000_project_hard_isolation
--   npm run deploy:production

-- 1) Диагностика: списания без строки в ManusSessionLink
SELECT c.id, c."manusSessionId", c."eventId"
FROM "ManusChatCharge" c
WHERE NOT EXISTS (
  SELECT 1 FROM "ManusSessionLink" m WHERE m."manusSessionId" = c."manusSessionId"
);

-- 2) Диагностика: ownerId песочниц / шаринга не из User (FK для INSERT в Project)
SELECT 'SandboxProjectState' AS src, s."sandboxId" AS key, s."ownerId" AS bad_owner
FROM "SandboxProjectState" s
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = s."ownerId")
UNION ALL
SELECT 'SandboxShare', ss."sandboxId", ss."ownerId"
FROM "SandboxShare" ss
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = ss."ownerId")
UNION ALL
SELECT 'PublishDomainBinding', p."sandboxId", p."ownerId"
FROM "PublishDomainBinding" p
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = p."ownerId")
UNION ALL
SELECT 'ManusSessionLink', m."manusSessionId", m."userId"
FROM "ManusSessionLink" m
WHERE NOT EXISTS (SELECT 1 FROM "User" u WHERE u.id = m."userId");

-- 3) Исправление: удалить «осиротевшие» списания (тот же DELETE, что в миграции).
-- Раскомментируйте одну строку DELETE после проверки SELECT выше.
-- DELETE FROM "ManusChatCharge" c
-- WHERE NOT EXISTS (
--   SELECT 1 FROM "ManusSessionLink" m WHERE m."manusSessionId" = c."manusSessionId"
-- );

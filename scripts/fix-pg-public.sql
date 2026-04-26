-- Выполнить, если Prisma: «User ... was denied access on the database ... .public»
-- Локально (Postgres в Docker из корня репо): npm run db:public-grants
-- Вручную: docker compose exec -T db psql -U lemnity -d lemnity < scripts/fix-pg-public.sql
-- Без Docker: psql от суперпользователя с каталога репо: psql ... -f scripts/fix-pg-public.sql

GRANT ALL ON SCHEMA public TO lemnity;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO lemnity;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO lemnity;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO lemnity;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO lemnity;

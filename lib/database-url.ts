/** Схема Prisma — только PostgreSQL; SQLite (`file:…`) не поддерживается. */

export function getPostgresDatabaseUrlErrorMessage(): string | null {
  const raw = process.env.DATABASE_URL?.trim() ?? "";
  if (!raw) {
    return "База не настроена: задайте DATABASE_URL (строка postgresql://…). См. docker-compose.yml и .env.local.example.";
  }
  if (!raw.startsWith("postgresql://") && !raw.startsWith("postgres://")) {
    return "DATABASE_URL должен начинаться с postgresql:// или postgres://. Формат file:… (SQLite) с текущей схемой Prisma не совместим. Скопируйте пример из .env.local.example и запустите Postgres: docker compose up -d db";
  }
  return null;
}

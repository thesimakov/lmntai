import { Prisma } from "@prisma/client";

const PUBLIC_SCHEMA_DENIED_HINT =
  "Пользователь БД не может работать со схемой public. Локально: остановить контейнер, удалить volume и поднять заново (данные в Postgres пропадут): `docker compose down -v && docker compose up -d db`, затем `npx prisma migrate deploy`. Либо в `psql` под суперпользователем выполнить `GRANT ALL ON SCHEMA public TO lemnity;` — см. `scripts/fix-pg-public.sql`.";

function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Сообщение для формы входа; null — не базовая ошибка Prisma. */
export function getAuthDatabaseUserMessage(err: unknown): string | null {
  const text = errorText(err);
  const lower = text.toLowerCase();

  if (
    lower.includes("denied access") &&
    (lower.includes(".public") || lower.includes("schema public") || lower.includes(" public"))
  ) {
    return PUBLIC_SCHEMA_DENIED_HINT;
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    if (lower.includes("denied access")) {
      return PUBLIC_SCHEMA_DENIED_HINT;
    }
    return "Не удаётся подключиться к PostgreSQL. Запустите Docker Desktop, в корне проекта выполните: npm run db:setup (или: docker compose up -d db и npx prisma migrate deploy). Проверьте DATABASE_URL.";
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P1000":
      case "P1001":
      case "P1017":
        return "База данных недоступна. Убедитесь, что PostgreSQL запущен и в DATABASE_URL указаны верный хост и порт.";
      case "P1010":
        return "Доступ к базе отклонён: неверный логин/пароль или нет прав на схему public. Проверьте DATABASE_URL. Локально: docker compose down -v && docker compose up -d db, затем npx prisma migrate deploy.";
      case "P2021":
      case "P2010":
        return "Таблицы в базе не созданы. Выполните: npx prisma migrate deploy";
      default:
        break;
    }
  }

  if (lower.includes("p1010") || lower.includes("password authentication failed")) {
    return "Доступ к PostgreSQL отклонён. Проверьте пользователя и пароль в DATABASE_URL (см. docker-compose.yml: lemnity/lemnity).";
  }
  if (lower.includes("p1001") || lower.includes("can't reach database") || lower.includes("econnrefused")) {
    return "Не удаётся достучаться до PostgreSQL. Запустите: docker compose up -d db";
  }
  if (lower.includes("does not exist") && (lower.includes("relation") || lower.includes("table"))) {
    return "В базе нет таблиц. Выполните: npx prisma migrate deploy";
  }
  if (lower.includes("datasource") || lower.includes("postgresql://")) {
    return "Ошибка настройки DATABASE_URL. Нужна строка postgresql://… См. .env.local.example.";
  }

  return null;
}

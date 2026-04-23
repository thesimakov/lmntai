# Lemnity — Dashboard + RouterAI Billing (прототип)

Продакшен‑сайт: **https://lemnity.com** (задаётся также через `NEXTAUTH_URL` и `NEXT_PUBLIC_SITE_URL`).

## Запуск

1) Скопируйте переменные окружения:

```bash
cp .env.local.example .env.local
```

2) Установите зависимости:

```bash
pnpm i
```

3) Миграции Prisma:

```bash
pnpm prisma:migrate -- --name add_billing
```

4) Запуск:

```bash
pnpm dev
```

## Важно

- Мастер‑ключ RouterAI хранится **только** на сервере (`AI_GATEWAY_API_KEY`).
- Генерация идёт через `/api/generate-stream` и списывает токены по `usage` из стрима (если провайдер возвращает usage в SSE).
- Песочница в этом репо — **заглушка** (`lib/sandbox-manager.ts`) с превью через `/api/sandbox/:id` и экспортом ZIP из файлов.

## RouterAI: чеклист для сервера

1. В `.env` (или `.env.production`) задайте:

```bash
AI_GATEWAY_BASE_URL=https://routerai.ru/api/v1
AI_GATEWAY_API_KEY=<ваш_routerai_ключ>
```

2. Примените переменные в процессе:

```bash
pm2 restart lmntai --update-env
```

3. Проверьте API-маршруты:
   - генерация: `POST /api/generate-stream`
   - сборка промпта: `POST /api/prompt-builder`
   - smoke-check (только для админа): `GET /api/routerai/health`

`/api/routerai/health` возвращает JSON с `ok`, `latencyMs`, `model`, `textPreview` и `usage`.  
При ошибке конфигурации вернётся `500`, при ошибке апстрима RouterAI — `502`.

## Деплой на сервер

1. На сервере: `git clone` репозитория (или `git pull`), скопируйте `.env.local.example` → `.env` / `.env.local`, выставьте `DATABASE_URL`, `NEXTAUTH_SECRET`, **`NEXTAUTH_URL=https://lemnity.com`**, **`NEXT_PUBLIC_SITE_URL=https://lemnity.com`**, ключи OAuth/SMTP по необходимости.
2. База: `docker compose up -d` (Postgres из репо) или свой managed Postgres → `npx prisma migrate deploy`.
3. Сборка и запуск: `npm ci && npm run build && npm run start` (или PM2/systemd вокруг `npm run start`). Убедитесь, что reverse proxy (Nginx/Caddy) отдаёт HTTPS на **https://lemnity.com** и проксирует на порт приложения.

Заливка в GitHub с локальной машины (после коммита):

```bash
git remote add origin https://github.com/<org>/<repo>.git   # если ещё не добавлен
git push -u origin main
```


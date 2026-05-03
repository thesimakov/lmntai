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
- В режиме моста Lemnity AI (`LEMNITY_AI_BRIDGE_ENABLED=1` или устар. `MANUS_FULL_PARITY_ENABLED=1`) legacy-маршруты `/api/generate-stream` и `/api/prompt-builder` выключаются, а сборка идёт через `/api/lemnity-ai/*` (старый путь `/api/manus/*` редиректится на него).

## RouterAI: чеклист для сервера

1. В серверном env-файле (рекомендовано вне репозитория: `/etc/lemnity/production.env`) задайте:

```bash
AI_GATEWAY_BASE_URL=https://routerai.ru/api/v1
AI_GATEWAY_API_KEY=<ваш_routerai_ключ>
```

2. Примените переменные в процессе:

```bash
set -a && . /etc/lemnity/production.env && set +a && pm2 restart lemnity --update-env
```

3. Проверьте API-маршруты:
   - генерация: `POST /api/generate-stream`
   - сборка промпта: `POST /api/prompt-builder`
   - smoke-check (только для админа): `GET /api/routerai/health`

`/api/routerai/health` возвращает JSON с `ok`, `latencyMs`, `model`, `textPreview` и `usage`.  
При ошибке конфигурации вернётся `500`, при ошибке апстрима RouterAI — `502`.

## Lemnity AI — мост к upstream builder

### Env

В `/etc/lemnity/production.env` (рекомендуемые имена):

```bash
LEMNITY_AI_BRIDGE_ENABLED=1
LEMNITY_AI_UPSTREAM_URL=http://127.0.0.1:8000
# опционально Bearer к upstream:
# LEMNITY_AI_UPSTREAM_BEARER_TOKEN=<token>
```

Обратная совместимость: `MANUS_FULL_PARITY_ENABLED`, `MANUS_API_BASE_URL`, `MANUS_API_BEARER_TOKEN` по-прежнему читаются.

Клиент узнаёт режим через `GET /api/lemnity-ai/bootstrap` (пересборка не обязательна).

### Встроенный upstream `lemnity-builder` (рекомендуется вместо Docker Manus)

Сервис в репозитории: `services/lemnity-builder` (Node.js, Postgres для сессий, вызовы LLM через **RouterAI**).

```bash
# из корня репо, с теми же AI_GATEWAY_* и DATABASE_URL, что у Next
npm run builder:install
npm run builder:dev
```

В `.env` / `production.env` выставьте `LEMNITY_AI_UPSTREAM_URL=http://127.0.0.1:8787` (или порт из `LEMNITY_BUILDER_PORT`). Опционально один и тот же `LEMNITY_AI_UPSTREAM_BEARER_TOKEN` и `LEMNITY_BUILDER_BEARER_TOKEN`. Прод: `npm run builder:build`, затем PM2-процесс `lemnity-builder` в `ecosystem.config.cjs` (см. комментарии в файле).

### Поднять upstream Docker Compose

Интерфейс сборки — `/playground/build` в Lemnity. Каталог с `docker-compose.yml` upstream **не входит в этот репозиторий**: положите его где угодно на сервере и задайте **абсолютный путь** в переменной `LEMNITY_AI_STACK_DIR` (или устар. `MANUS_REPO_DIR`).

Пример:

```bash
export LEMNITY_AI_STACK_DIR=/opt/lemnity-ai-builder
cd /root/lmntai
npm run lemnity-ai:up
```

Одной строкой без `export`:

```bash
cd /root/lmntai && LEMNITY_AI_STACK_DIR=/opt/lemnity-ai-builder npm run lemnity-ai:up
```

(алиас `npm run manus:up` вызывает ту же команду.)

### Проверка health

```bash
cd /root/lmntai
LEMNITY_AI_UPSTREAM_URL=http://127.0.0.1:8000 LMNTAI_APP_URL=http://127.0.0.1:3000 npm run lemnity-ai:health
curl -fsS http://127.0.0.1:3000/api/lemnity-ai/health
```

### Поведение при включённом мосте

- `/playground/build` ходит в upstream FastAPI через `/api/lemnity-ai/*`.
- История сессий в Postgres: таблицы `ManusSessionLink` / `ManusChatCharge` (имена колонок исторические).
- Чат и SSE: `POST /api/lemnity-ai/sessions/:id/chat`.
- Списание токенов: `TokenUsageLog` + дедупликация по `event_id`.

## Деплой на сервер

Данные и настройки должны жить отдельно от кода:
- **Код**: `/root/lmntai` (обновляется через git).
- **Настройки**: `/etc/lemnity/production.env` (не хранить в git).
- **Данные Postgres**: Docker volume `lemnity_pg` из `docker-compose.yml` (не удалять через `down -v`).

### 1) Одноразовая настройка env на сервере

```bash
mkdir -p /etc/lemnity && cp -n /root/lmntai/.env.local.example /etc/lemnity/production.env && nano /etc/lemnity/production.env
```

Заполните минимум: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SITE_URL` и ключи OAuth/SMTP.

Для сборки через мост Lemnity AI дополнительно: `LEMNITY_AI_BRIDGE_ENABLED=1`, `LEMNITY_AI_UPSTREAM_URL` (URL живого upstream API, чаще `http://127.0.0.1:8000` на том же сервере) и **`LEMNITY_AI_STACK_DIR`** — абсолютный путь к каталогу с `docker-compose.yml` upstream, если пользуетесь `npm run lemnity-ai:up`. Если `PUT /api/lemnity-ai/sessions` даёт **500**, проверьте: upstream слушает тот же хост/порт, что в `LEMNITY_AI_UPSTREAM_URL`, и логи: `pm2 logs lemnity --lines 80`.

### 2) Первый запуск приложения через PM2 (если процесса ещё нет)

```bash
cd /root/lmntai && set -a && . /etc/lemnity/production.env && set +a && pm2 start ecosystem.config.cjs --only lemnity --update-env && pm2 save
```

### 3) Основная one-line команда обновления билда без потери данных

```bash
cd /root/lmntai && set -a && . /etc/lemnity/production.env && set +a && npm run deploy:production
```

Что делает `deploy:production`:
- `git pull --ff-only`
- `npm ci`
- `npm run prisma:generate`
- `npx prisma migrate deploy`
- `npm run build`
- `pm2 restart lemnity --update-env` (или первый старт при отсутствии процесса)

### 4) Критично важно для сохранности данных

- Не используйте в обычном деплое `docker compose down -v`.
- Не используйте в обычном деплое `npm run db:reset`.
- Проверьте прокси (Nginx/Caddy): HTTPS на `https://lemnity.com` должен проксировать на `127.0.0.1:3000`.

### Автопровижининг сертификатов для новых publish-host

Если хотите автоматически выпускать TLS для новых доменов/поддоменов при публикации, задайте в серверном env:

```bash
PUBLISH_DOMAIN_PROVISION_HOOK='bash /var/www/lmntai/scripts/publish-domain-provision.example.sh'
LETSENCRYPT_EMAIL=ops@example.com
```

Хук запускается асинхронно при переходе домена в `VERIFIED` и получает переменные:
`LMNT_PUBLISH_HOST`, `LMNT_PUBLISH_PROJECT_ID`, `LMNT_PUBLISH_OWNER_ID`, `LMNT_PUBLISH_EVENT`.

Для встроенной зоны `*.{NEXT_PUBLIC_PUBLISH_BASE_DOMAIN}` на проде предпочтительнее wildcard-сертификат (DNS-01), чтобы не упираться в rate limits при большом количестве поддоменов.

Заливка в GitHub с локальной машины (после коммита):

```bash
git remote add origin https://github.com/<org>/<repo>.git   # если ещё не добавлен
git push -u origin main
```


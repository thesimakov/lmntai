#!/usr/bin/env bash
set -euo pipefail

# Без этого длинный вывод npm/git может открывать `less` — в SSH кажется, что сессия «зависла» (выйти: q).
export PAGER=cat
export GIT_PAGER=cat
export CI=true

ENV_FILE="${LEMNITY_ENV_FILE:-/etc/lemnity/production.env}"
APP_NAME="${LEMNITY_PM2_APP_NAME:-lemnity}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: env file not found at $ENV_FILE"
  echo "Create it first (outside git), for example:"
  echo "  mkdir -p /etc/lemnity && cp -n .env.local.example /etc/lemnity/production.env"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

echo "==> [deploy] git pull"
git pull --ff-only
echo "==> [deploy] npm ci (может занять много минут на слабом CPU/RAM)…"
npm ci --no-fund --no-audit
echo "==> [deploy] prisma generate + migrate"
npm run prisma:generate
npx prisma migrate deploy
echo "==> [deploy] next build (часто 5–20+ мин; при OOM смотрите dmesg / free -h)…"
rm -rf .next
# Явно production: если в ENV_FILE есть NODE_ENV=development, без этого ломается пререндер /404 (Next 15).
NODE_ENV=production npm run build

if [[ -f services/lemnity-builder/package.json ]]; then
  echo "==> [deploy] lemnity-builder: npm ci + build"
  npm ci --no-fund --no-audit --prefix services/lemnity-builder
  NODE_ENV=production npm run build --prefix services/lemnity-builder
fi

echo "==> [deploy] pm2"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --only "$APP_NAME" --update-env
fi

if pm2 describe lemnity-builder >/dev/null 2>&1; then
  pm2 restart lemnity-builder --update-env
fi

pm2 save
echo "==> [deploy] готово"

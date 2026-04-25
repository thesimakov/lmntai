#!/usr/bin/env bash
set -euo pipefail

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

git pull --ff-only
npm ci
npm run prisma:generate
npx prisma migrate deploy
rm -rf .next
npm run build

if [[ -f services/lemnity-builder/package.json ]]; then
  npm ci --prefix services/lemnity-builder
  npm run build --prefix services/lemnity-builder
fi

if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  pm2 start ecosystem.config.cjs --only "$APP_NAME" --update-env
fi

if pm2 describe lemnity-builder >/dev/null 2>&1; then
  pm2 restart lemnity-builder --update-env
fi

pm2 save

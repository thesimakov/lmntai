#!/usr/bin/env bash
set -euo pipefail

# Без этого длинный вывод npm/git может открывать `less` — в SSH кажется, что сессия «зависла» (выйти: q).
export PAGER=cat
export GIT_PAGER=cat
export CI=true
# npm: не молчать после списка deprecated — показывать прогресс скачивания/распаковки.
export NPM_CONFIG_PROGRESS=true

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

# production.env часто задаёт NODE_ENV=production — тогда npm ci не ставит devDependencies
# (autoprefixer, tailwind, typescript, patch-package), и next build падает.
unset NODE_ENV
export NPM_CONFIG_PRODUCTION=false

# next build на VPS <4 GB RAM часто падает с SIGABRT (V8 OOM). Heap задаём явно;
# при нехватке физической памяти нужен swap (см. scripts/setup-build-swap.sh).
resolve_build_heap_mb() {
  if [[ -n "${LEMNITY_NODE_BUILD_HEAP_MB:-}" ]]; then
    echo "$LEMNITY_NODE_BUILD_HEAP_MB"
    return
  fi
  if [[ -r /proc/meminfo ]]; then
    local avail_kb avail_mb target
    avail_kb="$(awk '/^MemAvailable:/ {print $2; exit}' /proc/meminfo)"
    avail_mb=$((avail_kb / 1024))
    target=$((avail_mb * 70 / 100))
    if (( target < 1536 )); then echo 1536; return; fi
    if (( target > 4096 )); then echo 4096; return; fi
    echo "$target"
    return
  fi
  echo 3072
}

BUILD_HEAP_MB="$(resolve_build_heap_mb)"
export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=${BUILD_HEAP_MB}"
# Меньше параллельных воркеров SSG — ниже пик RAM (Next 15).
export LEMNITY_BUILD_LOW_MEMORY="${LEMNITY_BUILD_LOW_MEMORY:-1}"

if [[ -r /proc/meminfo ]]; then
  AVAIL_MB="$(awk '/^MemAvailable:/ {print int($2/1024); exit}' /proc/meminfo)"
  SWAP_MB="$(awk '/^SwapTotal:/ {print int($2/1024); exit}' /proc/meminfo)"
  echo "==> [deploy] память: MemAvailable≈${AVAIL_MB}MB, swap≈${SWAP_MB}MB, NODE heap=${BUILD_HEAP_MB}MB"
  if (( AVAIL_MB + SWAP_MB < 2500 )); then
    echo "==> [deploy] ВНИМАНИЕ: мало RAM+swap для next build. Рекомендуется swap 4G:"
    echo "    sudo bash scripts/setup-build-swap.sh"
  fi
fi

echo "==> [deploy] git pull"
git pull --ff-only
echo "==> [deploy] npm ci — старт $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "    Предупреждения «deprecated» — норма. Дальше может быть тишина: скачивание пакетов, postinstall (patch-package)."
echo "    Это не зависание; на слабом CPU шаг идёт долго. Для детализации: DEBUG_DEPLOY=1 bash $0"
echo "==> [deploy] npm ci (может занять много минут на слабом CPU/RAM)…"
if [[ "${DEBUG_DEPLOY:-}" == "1" ]]; then set -x; fi
npm ci --no-fund --no-audit --include=dev
if [[ "${DEBUG_DEPLOY:-}" == "1" ]]; then set +x; fi
echo "==> [deploy] npm ci — конец $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "==> [deploy] prisma generate + migrate"
npm run prisma:generate
npx prisma migrate deploy
echo "==> [deploy] next build — старт $(date -u +%Y-%m-%dT%H:%M:%SZ) (часто 5–20+ мин; OOM: free -h, dmesg | tail -20; LEMNITY_NODE_BUILD_HEAP_MB=4096)"
NEXT_BACKUP=".next.deploy-backup.$$"
if [[ -d .next && -f .next/BUILD_ID ]]; then
  rm -rf "$NEXT_BACKUP"
  mv .next "$NEXT_BACKUP"
  echo "==> [deploy] предыдущий .next сохранён в $NEXT_BACKUP (откат при ошибке build)"
fi
# Явно production: если в ENV_FILE есть NODE_ENV=development, без этого ломается пререндер /404 (Next 15).
if ! NODE_ENV=production npm run build; then
  echo "==> [deploy] ОШИБКА: next build не прошёл. PM2 не перезапускаем."
  rm -rf .next
  if [[ -d "$NEXT_BACKUP" ]]; then
    mv "$NEXT_BACKUP" .next
    echo "==> [deploy] восстановлен предыдущий .next"
  fi
  exit 1
fi
rm -rf "$NEXT_BACKUP"
if [[ ! -f .next/BUILD_ID ]]; then
  echo "==> [deploy] ОШИБКА: .next/BUILD_ID отсутствует после build"
  exit 1
fi
echo "==> [deploy] next build — конец $(date -u +%Y-%m-%dT%H:%M:%SZ) (BUILD_ID=$(cat .next/BUILD_ID))"

if [[ -f services/lemnity-builder/package.json ]]; then
  echo "==> [deploy] lemnity-builder: npm ci + build — старт $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  npm ci --no-fund --no-audit --prefix services/lemnity-builder
  NODE_ENV=production npm run build --prefix services/lemnity-builder
  echo "==> [deploy] lemnity-builder — конец $(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

echo "==> [deploy] pm2"
if ! pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 start ecosystem.config.cjs --only "$APP_NAME" --update-env
elif pm2 describe "$APP_NAME" 2>/dev/null | grep -q "stopped"; then
  pm2 start "$APP_NAME" --update-env
else
  pm2 restart "$APP_NAME" --update-env
fi

if pm2 describe lemnity-builder >/dev/null 2>&1; then
  pm2 restart lemnity-builder --update-env
fi

pm2 save
echo "==> [deploy] готово"
echo "==> [deploy] nginx: для загрузки PDF/XLSX (analytics, marketing) нужен client_max_body_size 10m;"
echo "    см. scripts/reverse-proxy-body-size-snippet.txt и deploy/nginx/lemnity-unified-tls.example.conf"

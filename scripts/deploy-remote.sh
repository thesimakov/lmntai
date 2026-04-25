#!/usr/bin/env bash
# Только с локальной машины (не с root@сервер). Делает SSH и на сервере запускает deploy-production.sh.
# На самом сервере: cd /var/www/lmntai && git pull && npm run deploy:production
#
# Запуск с локальной машины / из Cursor: тянет репозиторий на сервере, билд, PM2.
# Требования на сервере: клон репо, /etc/lemnity/production.env, Node, PM2 — как для deploy-production.sh
#
# Настройка:
#   cp scripts/deploy-remote.env.example scripts/deploy-remote.env
#   # заполнить LEMNITY_DEPLOY_SSH и LEMNITY_DEPLOY_PATH
#
# Перед запуском запушьте ветку в origin — на сервере выполняется git pull --ff-only.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_LOCAL="$ROOT_DIR/scripts/deploy-remote.env"
if [[ -f "$ENV_LOCAL" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ENV_LOCAL"
  set +a
fi

SSH_TARGET="${LEMNITY_DEPLOY_SSH:-}"
REMOTE_PATH="${LEMNITY_DEPLOY_PATH:-}"

if [[ -z "$SSH_TARGET" || -z "$REMOTE_PATH" ]]; then
  cat <<'EOF' >&2
Укажите LEMNITY_DEPLOY_SSH и LEMNITY_DEPLOY_PATH.

  Скопируйте пример и отредактируйте:
    cp scripts/deploy-remote.env.example scripts/deploy-remote.env

  Или задайте в окружении:
    export LEMNITY_DEPLOY_SSH=lemnity-prod
    export LEMNITY_DEPLOY_PATH=/var/www/lmntai
    npm run deploy:remote

Перед деплоем запушьте коммиты в origin (на сервере: git pull --ff-only).
EOF
  exit 1
fi

echo "→ SSH $SSH_TARGET — cd $REMOTE_PATH → scripts/deploy-production.sh"

remote_cd_q=$(printf %q "$REMOTE_PATH")
# shellcheck disable=SC2029
ssh "$SSH_TARGET" bash -lc "set -euo pipefail; cd ${remote_cd_q} && exec bash scripts/deploy-production.sh"

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LMNTAI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Каталог с docker-compose ai-manus: по умолчанию внутри этого репозитория (скопируйте сюда свою папку с машины разработки).
MANUS_REPO_DIR="${MANUS_REPO_DIR:-$LMNTAI_ROOT/ai-manus-main}"
MANUS_COMPOSE_FILE="${MANUS_COMPOSE_FILE:-docker-compose.yml}"

if [[ ! -d "$MANUS_REPO_DIR" ]]; then
  echo "Error: каталог Manus не найден: $MANUS_REPO_DIR"
  echo "Скопируйте вашу локальную папку ai-manus-main в корень lmntai (рядом с package.json) или задайте MANUS_REPO_DIR."
  exit 1
fi

if [[ ! -f "$MANUS_REPO_DIR/$MANUS_COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $MANUS_REPO_DIR/$MANUS_COMPOSE_FILE"
  exit 1
fi

echo "==> Starting ai-manus-main stack from $MANUS_REPO_DIR"
docker compose -f "$MANUS_REPO_DIR/$MANUS_COMPOSE_FILE" up -d backend mongodb redis sandbox claw frontend
docker compose -f "$MANUS_REPO_DIR/$MANUS_COMPOSE_FILE" ps

echo
echo "Stack is up. Next: run scripts/manus-full-parity-health.sh"

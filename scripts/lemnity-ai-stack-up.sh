#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LMNTAI_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Каталог с docker-compose upstream builder: по умолчанию внутри репозитория.
LEMNITY_AI_STACK_DIR="${LEMNITY_AI_STACK_DIR:-${MANUS_REPO_DIR:-$LMNTAI_ROOT/ai-manus-main}}"
LEMNITY_AI_COMPOSE_FILE="${LEMNITY_AI_COMPOSE_FILE:-${MANUS_COMPOSE_FILE:-docker-compose.yml}}"

if [[ ! -d "$LEMNITY_AI_STACK_DIR" ]]; then
  echo "Error: каталог стека Lemnity AI не найден: $LEMNITY_AI_STACK_DIR"
  echo "Скопируйте папку upstream builder в корень lmntai (например ai-manus-main) или задайте LEMNITY_AI_STACK_DIR / MANUS_REPO_DIR."
  exit 1
fi

if [[ ! -f "$LEMNITY_AI_STACK_DIR/$LEMNITY_AI_COMPOSE_FILE" ]]; then
  echo "Error: compose file not found: $LEMNITY_AI_STACK_DIR/$LEMNITY_AI_COMPOSE_FILE"
  exit 1
fi

echo "==> Starting Lemnity AI upstream stack from $LEMNITY_AI_STACK_DIR"
docker compose -f "$LEMNITY_AI_STACK_DIR/$LEMNITY_AI_COMPOSE_FILE" up -d backend mongodb redis sandbox claw frontend
docker compose -f "$LEMNITY_AI_STACK_DIR/$LEMNITY_AI_COMPOSE_FILE" ps

echo
echo "Stack is up. Next: npm run lemnity-ai:health"

#!/usr/bin/env bash
set -euo pipefail

MANUS_REPO_DIR="${MANUS_REPO_DIR:-/root/ai-manus-main}"
MANUS_COMPOSE_FILE="${MANUS_COMPOSE_FILE:-docker-compose.yml}"

if [[ ! -d "$MANUS_REPO_DIR" ]]; then
  echo "Error: MANUS_REPO_DIR not found: $MANUS_REPO_DIR"
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

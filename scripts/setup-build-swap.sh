#!/usr/bin/env bash
# Однократно на сервере: добавить swap для next build (OOM / SIGABRT).
# Запуск: sudo bash scripts/setup-build-swap.sh
set -euo pipefail

SWAP_FILE="${LEMNITY_SWAP_FILE:-/swapfile}"
SWAP_GB="${LEMNITY_SWAP_GB:-4}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите от root: sudo bash $0"
  exit 1
fi

if swapon --show | grep -q .; then
  echo "Swap уже включён:"
  swapon --show
  free -h
  exit 0
fi

if [[ ! -f "$SWAP_FILE" ]]; then
  echo "==> Создаём ${SWAP_GB}G swap в $SWAP_FILE"
  fallocate -l "${SWAP_GB}G" "$SWAP_FILE" 2>/dev/null || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=$((SWAP_GB * 1024)) status=progress
  chmod 600 "$SWAP_FILE"
  mkswap "$SWAP_FILE"
fi

swapon "$SWAP_FILE"
grep -qF "$SWAP_FILE" /etc/fstab 2>/dev/null || echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab

echo "==> Готово"
free -h
swapon --show

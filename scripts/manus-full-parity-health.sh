#!/usr/bin/env bash
set -euo pipefail

MANUS_API_BASE_URL="${MANUS_API_BASE_URL:-http://127.0.0.1:8000}"
LMNTAI_APP_URL="${LMNTAI_APP_URL:-http://127.0.0.1:3000}"

echo "==> Manus backend health check"
echo "GET $MANUS_API_BASE_URL/sessions"
curl -fsS "$MANUS_API_BASE_URL/sessions" | sed -E 's/"events":[[][^]]*[]]/"events":[...]/g' || {
  echo "Manus backend check failed"
  exit 1
}

echo
echo "==> Lmntai bridge health check"
echo "GET $LMNTAI_APP_URL/api/manus/health"
curl -fsS "$LMNTAI_APP_URL/api/manus/health" || {
  echo "Lmntai Manus bridge check failed"
  exit 1
}

echo
echo "Health checks passed."

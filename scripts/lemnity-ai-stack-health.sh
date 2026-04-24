#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_URL="${LEMNITY_AI_UPSTREAM_URL:-${MANUS_API_BASE_URL:-http://127.0.0.1:8000}}"
LMNTAI_APP_URL="${LMNTAI_APP_URL:-http://127.0.0.1:3000}"

echo "==> Lemnity AI upstream health check"
echo "GET $UPSTREAM_URL/sessions"
curl -fsS "$UPSTREAM_URL/sessions" | sed -E 's/"events":[[][^]]*[]]/"events":[...]/g' || {
  echo "Upstream backend check failed"
  exit 1
}

echo
echo "==> Lmntai bridge health check"
echo "GET $LMNTAI_APP_URL/api/lemnity-ai/health"
curl -fsS "$LMNTAI_APP_URL/api/lemnity-ai/health" || {
  echo "Lemnity AI bridge check failed"
  exit 1
}

echo
echo "Health checks passed."

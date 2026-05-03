#!/usr/bin/env bash
set -euo pipefail

# Пример хука для PUBLISH_DOMAIN_PROVISION_HOOK.
# Вызывается приложением асинхронно после VERIFIED-привязки домена.
#
# Входные переменные:
#   LMNT_PUBLISH_HOST
#   LMNT_PUBLISH_PROJECT_ID
#   LMNT_PUBLISH_OWNER_ID
#   LMNT_PUBLISH_EVENT   (bind_verified | verify_passed)
#
# Минимальный пример: выпуск/обновление сертификата для конкретного host через certbot+nginx.
# В проде лучше использовать wildcard-сертификат для встроенной зоны *.BASE_DOMAIN.

HOST="${LMNT_PUBLISH_HOST:-}"
EVENT="${LMNT_PUBLISH_EVENT:-}"
EMAIL="${LETSENCRYPT_EMAIL:-}"
LOCK_FILE="${PUBLISH_DOMAIN_CERT_LOCK_FILE:-/tmp/lemnity-certbot.lock}"

if [[ -z "$HOST" ]]; then
  exit 0
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "[publish-domain-provision] certbot not found, host=$HOST event=$EVENT" >&2
  exit 0
fi

if ! command -v flock >/dev/null 2>&1; then
  echo "[publish-domain-provision] flock not found, host=$HOST event=$EVENT" >&2
  exit 0
fi

CERTBOT_ARGS=(
  --nginx
  -d "$HOST"
  --non-interactive
  --agree-tos
  --keep-until-expiring
)

if [[ -n "$EMAIL" ]]; then
  CERTBOT_ARGS+=(-m "$EMAIL")
else
  CERTBOT_ARGS+=(--register-unsafely-without-email)
fi

# Защита от параллельных запусков certbot при массовых публикациях.
flock "$LOCK_FILE" certbot "${CERTBOT_ARGS[@]}"

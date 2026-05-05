#!/usr/bin/env bash
# Выпуск Let's Encrypt: lemnity.com + www + *.lemnity.com (DNS-01).
# Нужен для HTTPS на встроенных поддоменах публикации (lmnt.lemnity.com и т.д.).
# HTTP-01 для wildcard не подходит — только DNS challenge.
#
# Использование:
#   sudo bash scripts/issue-ssl-wildcard-lemnity.sh manual
#
# Cloudflare (apt install python3-certbot-dns-cloudflare):
#   export CLOUDFLARE_CREDENTIALS=/root/.secrets/cloudflare-lemnity.ini
#   sudo -E bash scripts/issue-ssl-wildcard-lemnity.sh cloudflare
#
# Файл credentials (пример для Cloudflare API Token с правами Zone → DNS → Edit):
#   dns_cloudflare_api_token = YOUR_TOKEN
#
# После выпуска: пропишите пути в nginx и nginx -t && systemctl reload nginx.
# Имя сертификата в renewal: --cert-name ниже (папка в live/).

set -euo pipefail

CERT_NAME="${LEMNITY_CERT_NAME:-lemnity-unified}"
MODE="${1:-}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Запустите от root (sudo)." >&2
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "Установите certbot (например: apt install certbot)." >&2
  exit 1
fi

DOMAINS=( -d lemnity.com -d www.lemnity.com -d '*.lemnity.com' )

case "$MODE" in
  manual)
    certbot certonly \
      --manual \
      --preferred-challenges dns \
      "${DOMAINS[@]}" \
      --cert-name "$CERT_NAME" \
      --agree-tos \
      -m "${LETSENCRYPT_EMAIL:-admin@lemnity.com}"
    ;;
  cloudflare)
    if [[ -z "${CLOUDFLARE_CREDENTIALS:-}" || ! -f "$CLOUDFLARE_CREDENTIALS" ]]; then
      echo "Задайте CLOUDFLARE_CREDENTIALS=/path/to/cloudflare.ini (см. заголовок скрипта)." >&2
      exit 1
    fi
    chmod 600 "$CLOUDFLARE_CREDENTIALS"
    certbot certonly \
      --authenticator dns-cloudflare \
      --dns-cloudflare-credentials "$CLOUDFLARE_CREDENTIALS" \
      "${DOMAINS[@]}" \
      --cert-name "$CERT_NAME" \
      --agree-tos \
      -m "${LETSENCRYPT_EMAIL:-admin@lemnity.com}"
    ;;
  *)
    echo "Режим: manual | cloudflare" >&2
    echo "  sudo bash scripts/issue-ssl-wildcard-lemnity.sh manual" >&2
    echo "  sudo -E CLOUDFLARE_CREDENTIALS=... bash scripts/issue-ssl-wildcard-lemnity.sh cloudflare" >&2
    exit 1
    ;;
esac

LIVE="/etc/letsencrypt/live/$CERT_NAME"
echo ""
echo "Готово. Ключи:"
echo "  ssl_certificate     $LIVE/fullchain.pem;"
echo "  ssl_certificate_key $LIVE/privkey.pem;"
echo ""
echo "Обновите nginx (один server на 443 для apex + www + *.lemnity.com), затем:"
echo "  nginx -t && systemctl reload nginx"
echo "Проверка:"
echo "  openssl s_client -connect lmnt.lemnity.com:443 -servername lmnt.lemnity.com </dev/null 2>/dev/null | openssl x509 -noout -ext subjectAltName"

#!/usr/bin/env bash
# Выпуск Let's Encrypt: lemnity.com + www + *.lemnity.com (DNS-01).
# Нужен для HTTPS на встроенных поддоменах публикации (lmnt.lemnity.com и т.д.).
# HTTP-01 для wildcard не подходит — только DNS challenge.
#
# Использование:
#
# REG.RU — руками в панели (TXT _acme-challenge при запросе certbot):
#   export LETSENCRYPT_EMAIL=you@lemnity.com
#   sudo -E bash scripts/issue-ssl-wildcard-lemnity.sh manual
#
# REG.RU — автомат через API (pip install certbot-dns-regru):
#   sudo pip install --break-system-packages certbot-dns-regru   # Ubuntu 24: см. ниже
#   sudo nano /etc/letsencrypt/regru.ini
#     dns_regru_username=ВАШ_ЛОГИН
#     dns_regru_password=ПАРОЛЬ_API   # https://www.reg.ru/user/account/settings/api/
#   sudo chmod 600 /etc/letsencrypt/regru.ini
#   export LETSENCRYPT_EMAIL=you@lemnity.com
#   sudo -E bash scripts/issue-ssl-wildcard-lemnity.sh regru
#
# Cloudflare (если DNS когда-нибудь перенесёте туда):
#   apt install python3-certbot-dns-cloudflare
#   export CLOUDFLARE_CREDENTIALS=/root/.secrets/cloudflare-lemnity.ini
#   dns_cloudflare_api_token = YOUR_TOKEN
#   sudo -E bash scripts/issue-ssl-wildcard-lemnity.sh cloudflare
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
  regru)
    CREDS="${REG_RU_CREDENTIALS:-/etc/letsencrypt/regru.ini}"
    if [[ ! -f "$CREDS" ]]; then
      echo "Создайте $CREDS с dns_regru_username / dns_regru_password (API REG.RU)." >&2
      echo "См. https://github.com/shadowpercifal/certbot-dns-regru" >&2
      exit 1
    fi
    chmod 600 "$CREDS"
    if ! certbot plugins 2>/dev/null | grep -qi 'dns-regru\|regru'; then
      echo "Установите плагин: sudo pip install certbot-dns-regru" >&2
      echo "На Ubuntu 24 при PEP668: sudo pip install --break-system-packages certbot-dns-regru" >&2
      echo "Или: apt install python3-pip && sudo pip install --break-system-packages certbot-dns-regru" >&2
      exit 1
    fi
    PROP="${REG_DNS_PROPAGATION_SECONDS:-240}"
    certbot certonly \
      --authenticator dns-regru \
      --dns-regru-credentials "$CREDS" \
      --dns-regru-propagation-seconds "$PROP" \
      "${DOMAINS[@]}" \
      --cert-name "$CERT_NAME" \
      --agree-tos \
      -m "${LETSENCRYPT_EMAIL:-admin@lemnity.com}"
    ;;
  *)
    echo "Режим: manual | regru | cloudflare" >&2
    echo "  sudo -E LETSENCRYPT_EMAIL=... bash scripts/issue-ssl-wildcard-lemnity.sh manual   # DNS у REG.RU вручную" >&2
    echo "  sudo -E LETSENCRYPT_EMAIL=... bash scripts/issue-ssl-wildcard-lemnity.sh regru    # REG.RU API + certbot-dns-regru" >&2
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

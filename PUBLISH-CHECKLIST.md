# Project Publish Checklist

## Current Product Behavior
- Publish in UI points to public share page: `/share/{sandboxId}`.
- Domain/subdomain mapping is persisted in app DB (`PublishDomainBinding`) and resolved by `middleware.ts` via `/api/publish/resolve`.
- Built-in host label uses `NEXT_PUBLIC_PUBLISH_BASE_DOMAIN` (default `lemnity.com`) for UX hints.

## Required Server Side
- Next.js app reachable at `http://127.0.0.1:3000`.
- Reverse proxy (Nginx/Caddy) configured to proxy host -> `/share/{sandboxId}`.
- HTTPS certificates (Certbot/ACME).
- Persistent DB + app process manager (PM2/systemd) for stable share metadata.
- Optional automation: set `PUBLISH_DOMAIN_PROVISION_HOOK` so app can trigger cert provisioning automatically when host becomes `VERIFIED`.

### TLS для встроенных поддоменов (`*.lemnity.com`)

Сертификат только для `lemnity.com` + `www` **не покрывает** `lmnt.lemnity.com` и др. — браузеры покажут ошибку имени сертификата.

**Решение:** один сертификат через **DNS-01**: **`lemnity.com`** (apex) + **`*.lemnity.com`** (wildcard). Имя **`www.lemnity.com`** отдельно в заказ нельзя — Let's Encrypt считает его избыточным рядом с wildcard; **`www` уже входит в `*.lemnity.com`**.

**Если DNS у REG.RU (без Cloudflare)** — два пути:

1. **Вручную в панели REG.RU** (без API): certbot покажет **TXT** для `_acme-challenge.lemnity.com` — добавьте в «Управление зоной DNS», подождите 5–15 минут, подтвердите в certbot. Удобно для разового выпуска; **авто-продление** тогда сложнее (нужен hook или переход на API).
   ```bash
   cd /var/www/lmntai
   export LETSENCRYPT_EMAIL=you@lemnity.com
   sudo -E bash scripts/issue-ssl-wildcard-lemnity.sh manual
   ```
2. **Автомат через API REG.RU** (рекомендуется для продления): пароль API в [настройках REG.RU](https://www.reg.ru/user/account/settings/api/), плагин community **`certbot-dns-regru`**:
   ```bash
   sudo apt-get install -y python3-pip
   sudo pip install --break-system-packages certbot-dns-regru
   sudo nano /etc/letsencrypt/regru.ini
   ```
   Содержимое:
   ```ini
   dns_regru_username=ВАШ_ЛОГИН
   dns_regru_password=ПАРОЛЬ_API
   ```
   ```bash
   sudo chmod 600 /etc/letsencrypt/regru.ini
   cd /var/www/lmntai
   export LETSENCRYPT_EMAIL=you@lemnity.com
   sudo -E bash scripts/issue-ssl-wildcard-lemnity.sh regru
   ```
   При необходимости увеличьте ожидание DNS: `export REG_DNS_PROPAGATION_SECONDS=300`.

Дополнительно (если DNS на **Cloudflare**): пакет `python3-certbot-dns-cloudflare` и `scripts/issue-ssl-wildcard-lemnity.sh cloudflare`.

Общие шаги после выпуска:

1. В nginx один блок `listen 443 ssl` с `server_name lemnity.com www.lemnity.com *.lemnity.com` и путями к **`/etc/letsencrypt/live/lemnity-unified/`** (или переименуйте через `LEMNITY_CERT_NAME`). Пример: `deploy/nginx/lemnity-unified-tls.example.conf`.
2. Уберите отдельные `ssl_certificate` только для apex, если они перехватывают весь `:443` как `default_server` без wildcard — иначе поддомены снова получат «чужой» сертификат.
3. Проверка:
   ```bash
   openssl s_client -connect lmnt.lemnity.com:443 -servername lmnt.lemnity.com </dev/null 2>/dev/null \
     | openssl x509 -noout -ext subjectAltName
   ```
   В SAN должны быть apex/www и **`DNS:*.lemnity.com`** (или явный список поддоменов).

## Required DNS Side
- A/AAAA record for each custom domain/subdomain to your server IP.
- If using wildcard subdomains, add wildcard DNS record (`*.your-domain.tld`).
- Optional but recommended: wildcard TLS certificate if using dynamic subdomains at scale.

## REG.RU (как для ребёнка)
1. Зайди в [REG.RU](https://www.reg.ru/) и открой свой домен.
2. Нажми **«Управление зоной DNS»**.
3. Чтобы домен открывался:
   - добавь запись **A**  
   - **Имя (Host)**: `@` (для корня) или `app` (для `app.домен.ru`)  
   - **Значение**: IP твоего сервера
4. Чтобы подтвердить домен в Lemnity (TXT-проверка):
   - добавь запись **TXT**
   - **Имя (Host)**: то, что показано в UI, например `_lemnity-verify.app.домен.ru`
   - **Значение**: строка вида `lemnity-verify=...` — в студии после привязки своего домена она **подставлена в поле и копируется в буфер**; при необходимости скопируй ещё раз из диалога «Публикация» (поле «Значение», кнопка с иконкой копирования)
5. Нажми «Сохранить».
6. Подожди 1–15 минут (иногда дольше), затем в Lemnity нажми **«Проверить домен»**.
7. Если не прошло — просто подожди ещё и проверь снова.

## Notes / Limitations
- Domain verification is TXT-based (`_lemnity-verify.<host>` with value `lemnity-verify=<token>`).
- Reverse proxy still required as ingress (TLS termination and request pass-through to app), but per-host manual `proxy_pass /share/{id}` no longer нужен.
- Для встроенных массовых поддоменов (`*.base-domain`) рекомендуется wildcard TLS (DNS-01), иначе per-host certbot может упираться в rate limits.

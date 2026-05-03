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

/**
 * Репозиторий upstream-песочницы (кнопка «исходники» в студии).
 * Переопределяется в `.env` для форка или приватного зеркала.
 */
export const SANDBOX_UPSTREAM_REPO_URL = (
  process.env.NEXT_PUBLIC_SANDBOX_UPSTREAM_REPO_URL ?? "https://github.com/Simpleyyt/ai-manus"
).replace(/\/$/, "");

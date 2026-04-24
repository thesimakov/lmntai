/**
 * Репозиторий upstream-песочницы (кнопка «исходники» в студии).
 * Задаётся только через `NEXT_PUBLIC_SANDBOX_UPSTREAM_REPO_URL` (см. `.env.local.example`).
 */
export const SANDBOX_UPSTREAM_REPO_URL = (process.env.NEXT_PUBLIC_SANDBOX_UPSTREAM_REPO_URL ?? "").replace(
  /\/$/,
  ""
);

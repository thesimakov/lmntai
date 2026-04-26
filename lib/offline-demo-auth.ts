/** Стабильный id для демо-входа без БД (локальная разработка). */
export const OFFLINE_DEMO_USER_ID = "offline-demo-user";

/**
 * Вход в демо без PostgreSQL (только `NODE_ENV=development`).
 *
 * - Задан `DEMO_LOGIN_PASSWORD` и в форме тот же пароль + email как в `DEMO_LOGIN_EMAIL` → обход БД,
 *   `DEMO_LOGIN_BYPASS_DB` не нужен.
 * - Пароля в env нет: нужен `DEMO_LOGIN_BYPASS_DB=true` (как раньше для `ensureUser` без пароля).
 *
 * В production всегда false — демо с паролем идёт в Prisma.
 */
export function isDemoDatabaseBypassed(
  env: NodeJS.ProcessEnv,
  nodeEnv: string | undefined,
  emailLower: string,
  providedPassword: string | undefined
): boolean {
  if (nodeEnv !== "development") {
    return false;
  }
  if (env.DEMO_LOGIN_ENABLED !== "true") {
    return false;
  }
  const demoEmail = env.DEMO_LOGIN_EMAIL?.toLowerCase().trim();
  if (!demoEmail || emailLower !== demoEmail) {
    return false;
  }
  const expected = env.DEMO_LOGIN_PASSWORD;
  if (expected) {
    return (providedPassword ?? "") === expected;
  }
  return env.DEMO_LOGIN_BYPASS_DB === "true";
}

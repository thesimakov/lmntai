/** Стабильный id для демо-входа без БД (только dev + DEMO_LOGIN_BYPASS_DB). */
export const OFFLINE_DEMO_USER_ID = "offline-demo-user";

export function isOfflineDemoSession(
  env: NodeJS.ProcessEnv,
  nodeEnv: string | undefined,
  emailLower: string
): boolean {
  if (nodeEnv !== "development") return false;
  if (env.DEMO_LOGIN_BYPASS_DB !== "true") return false;
  if (env.DEMO_LOGIN_ENABLED !== "true") return false;
  const demoEmail = env.DEMO_LOGIN_EMAIL?.toLowerCase().trim();
  if (!demoEmail || emailLower !== demoEmail) return false;
  return true;
}

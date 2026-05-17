/**
 * Последняя связанная сессия Lemnity AI на странице build (без ?sessionId= в URL восстановление repair в «Коде» возможно только с этим id).
 */
export const LEMNITY_BUILD_MANUS_SESSION_STORAGE_KEY = "lemnity.build.manusSessionId";

export function readStoredLemnityBuildManusSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LEMNITY_BUILD_MANUS_SESSION_STORAGE_KEY)?.trim();
    return raw || null;
  } catch {
    return null;
  }
}

export function writeStoredLemnityBuildManusSessionId(sessionId: string): void {
  if (typeof window === "undefined") return;
  const s = sessionId.trim();
  if (!s) {
    clearStoredLemnityBuildManusSessionId();
    return;
  }
  try {
    sessionStorage.setItem(LEMNITY_BUILD_MANUS_SESSION_STORAGE_KEY, s);
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredLemnityBuildManusSessionId(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(LEMNITY_BUILD_MANUS_SESSION_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

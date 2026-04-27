/** sessionStorage: последняя сессия сборки, чтобы «Назад» из /playground/puck не теряла контекст без ?sessionId в URL */
export const PUCK_RETURN_SESSION_STORAGE_KEY = "lemnity.puck.returnSessionId";

export function rememberBuildSessionForPuckReturn(sessionId: string | null | undefined): void {
  if (typeof window === "undefined" || !sessionId?.trim()) return;
  try {
    sessionStorage.setItem(PUCK_RETURN_SESSION_STORAGE_KEY, sessionId.trim());
  } catch {
    /* ignore */
  }
}

export function readBuildSessionForPuckReturn(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(PUCK_RETURN_SESSION_STORAGE_KEY);
    return v?.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

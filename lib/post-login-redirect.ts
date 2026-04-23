export const AFTER_LOGIN_SESSION_KEY = "lemnity.afterLogin";

export function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

/** Путь для callbackUrl: из sessionStorage или запасной. */
export function getPostLoginTarget(fallback = "/playground"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const s = sessionStorage.getItem(AFTER_LOGIN_SESSION_KEY);
    if (s && isSafeInternalPath(s)) return s;
  } catch {
    // ignore
  }
  return fallback;
}

/** После OAuth/email: приоритет у `?next=` в URL, иначе sessionStorage. */
export function resolvePostAuthRedirect(nextQuery: string | null): string {
  if (nextQuery) {
    try {
      const decoded = decodeURIComponent(nextQuery);
      if (isSafeInternalPath(decoded)) {
        try {
          sessionStorage.removeItem(AFTER_LOGIN_SESSION_KEY);
        } catch {
          // ignore
        }
        return decoded;
      }
    } catch {
      // ignore
    }
  }
  return consumePostLoginRedirect("/playground");
}

/** Сохранить путь для редиректа после OAuth / magic link / credentials. */
export function setPostLoginRedirect(path: string) {
  if (typeof window === "undefined") return;
  try {
    if (isSafeInternalPath(path)) sessionStorage.setItem(AFTER_LOGIN_SESSION_KEY, path);
  } catch {
    // ignore
  }
}

/** Прочитать и сбросить сохранённый путь. Только относительные пути без `//`. */
export function consumePostLoginRedirect(fallback = "/playground"): string {
  if (typeof window === "undefined") return fallback;
  try {
    const v = sessionStorage.getItem(AFTER_LOGIN_SESSION_KEY);
    sessionStorage.removeItem(AFTER_LOGIN_SESSION_KEY);
    if (v && isSafeInternalPath(v)) return v;
  } catch {
    // ignore
  }
  return fallback;
}

export function authContinueCallbackUrl(siteUrl: string): string {
  const next = encodeURIComponent(getPostLoginTarget("/playground"));
  return `${siteUrl}/auth/continue?next=${next}`;
}

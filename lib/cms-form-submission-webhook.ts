const MAX_WEBHOOK_URL_LENGTH = 2048;

/** Нормализует и проверяет URL вебхука для отправки заявок (внешний HTTPS). */
export function normalizeFormSubmissionWebhookUrl(raw: string | null | undefined): string | null {
  const t = typeof raw === "string" ? raw.trim() : "";
  if (!t) return null;
  if (t.length > MAX_WEBHOOK_URL_LENGTH) return null;
  let parsed: URL;
  try {
    parsed = new URL(t);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) return null;
  return t;
}

export type FormSubmissionWebhookPayload = {
  event: "cms_form_submission";
  submissionId: string;
  siteId: string;
  pageId: string | null;
  pagePath: string | null;
  formName: string | null;
  fields: Record<string, string>;
  createdAt: string;
  meta: { userAgent: string | null; ip: string | null };
};

const WEBHOOK_TIMEOUT_MS = 10_000;

/** POST JSON на вебхук; ошибки пробрасываются — вызывайте в фоне с .catch(...) */
export async function dispatchFormSubmissionWebhook(input: {
  url: string;
  payload: FormSubmissionWebhookPayload;
}): Promise<void> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), WEBHOOK_TIMEOUT_MS);
  try {
    const res = await fetch(input.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input.payload),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`webhook_http_${res.status}`);
  } finally {
    clearTimeout(timer);
  }
}

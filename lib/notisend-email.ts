/**
 * Транзакционная почта через [NotiSend Email API](https://notisend.ru/dev/email/api/).
 * Формат тел запросов совместим с официальным Ruby-клиентом (Bearer + JSON).
 * @see https://github.com/evserykh/notiesend-ruby/blob/master/lib/notisend/message.rb
 */

import { SITE_URL } from "@/lib/site";

const DEFAULT_BASE = "https://api.notisend.ru/v1/email";

function notisendApiKey(): string | null {
  const k =
    process.env.NOTISEND_API_KEY?.trim() ||
    process.env.NOTISEND_API_TOKEN?.trim();
  return k && k.length > 0 ? k : null;
}
function notisendFromEmail(): string | null {
  const from =
    process.env.NOTISEND_FROM_EMAIL?.trim() ||
    process.env.EMAIL_FROM?.trim();
  return from && from.length > 0 ? from : null;
}

function apiMessagesUrl(): string {
  const base = (process.env.NOTISEND_API_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
  return `${base}/messages`;
}

function apiTemplateUrl(templateId: string): string {
  const base = (process.env.NOTISEND_API_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
  return `${base}/templates/${encodeURIComponent(templateId)}/messages`;
}

export function isNotisendApiConfigured(): boolean {
  return Boolean(notisendApiKey());
}

/** Ключ + адрес отправителя (нужно для прямой отправки без шаблона NotiSend). */
export function isNotisendConfigured(): boolean {
  return Boolean(notisendApiKey() && notisendFromEmail());
}

type NotisendResult = { ok: true } | { ok: false; detail: string };

async function postNotisend(url: string, body: Record<string, unknown>): Promise<NotisendResult> {
  const key = notisendApiKey();
  if (!key) {
    return { ok: false, detail: "NOTISEND_API_KEY is not set" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000)
    });
    if (res.ok) {
      return { ok: true };
    }
    const text = await res.text().catch(() => "");
    try {
      const j = JSON.parse(text) as { errors?: Array<{ detail?: string }> };
      const detail = j?.errors?.[0]?.detail ?? text.slice(0, 500);
      return { ok: false, detail: `${res.status} ${detail}` };
    } catch {
      return { ok: false, detail: `${res.status} ${text.slice(0, 500)}` };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, detail: msg };
  }
}

/** Отправка по шаблону из кабинета NotiSend: тело `{ to, params }`. */
export async function notisendSendTemplate(
  templateId: string,
  to: string,
  params: Record<string, string>
): Promise<NotisendResult> {
  return postNotisend(apiTemplateUrl(templateId), {
    to: to.trim().toLowerCase(),
    params
  });
}

/** Прямая отправка: `from_email`, `to`, `subject`, `html` / `text`. */
export async function notisendSendRawMessage(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<NotisendResult> {
  const from = notisendFromEmail();
  if (!from) {
    return { ok: false, detail: "NOTISEND_FROM_EMAIL or EMAIL_FROM is required" };
  }
  const fromName = process.env.NOTISEND_FROM_NAME?.trim();
  const body: Record<string, unknown> = {
    from_email: from,
    to: input.to.trim().toLowerCase(),
    subject: input.subject,
    html: input.html
  };
  if (fromName) {
    body.from_name = fromName;
  }
  if (input.text?.trim()) {
    body.text = input.text;
  }
  return postNotisend(apiMessagesUrl(), body);
}

export async function sendWelcomeEmailAfterRegistration(input: {
  email: string;
  name: string | null;
}): Promise<void> {
  if (!notisendApiKey()) {
    console.warn(
      "[notisend] welcome: пропуск — не задан NOTISEND_API_KEY (или NOTISEND_API_TOKEN). Письмо не отправлено."
    );
    return;
  }
  const templateId = process.env.NOTISEND_WELCOME_TEMPLATE_ID?.trim();
  const displayName = input.name?.trim() || "друг";
  const params: Record<string, string> = {
    name: displayName,
    email: input.email.trim().toLowerCase(),
    site_url: SITE_URL
  };

  let result: NotisendResult;
  if (templateId) {
    result = await notisendSendTemplate(templateId, input.email, params);
  } else {
    if (!notisendFromEmail()) {
      console.warn("[notisend] welcome: задайте NOTISEND_WELCOME_TEMPLATE_ID или NOTISEND_FROM_EMAIL/EMAIL_FROM");
      return;
    }
    result = await notisendSendRawMessage({
      to: input.email,
      subject: "Добро пожаловать в Lemnity",
      html: `<p>Здравствуйте, ${escapeHtml(displayName)}!</p>
<p>Спасибо за регистрацию. Можно входить в студию: <a href="${escapeHtml(SITE_URL)}">${escapeHtml(SITE_URL)}</a></p>
<p>— Команда Lemnity</p>`,
      text: `Здравствуйте, ${displayName}!\n\nСпасибо за регистрацию. Студия: ${SITE_URL}\n\n— Команда Lemnity`
    });
  }

  if (!result.ok) {
    console.error("[notisend] welcome email failed:", result.detail);
    return;
  }
  console.info("[notisend] welcome email accepted by API for", input.email.trim().toLowerCase());
}

export async function sendPasswordResetEmail(input: {
  email: string;
  name: string | null;
  resetToken: string;
}): Promise<boolean> {
  if (!notisendApiKey()) {
    console.error("[notisend] password reset: NOTISEND_API_KEY is not set");
    return false;
  }
  const templateId = process.env.NOTISEND_PASSWORD_RESET_TEMPLATE_ID?.trim();
  const resetUrl = `${SITE_URL}/reset-password?token=${encodeURIComponent(input.resetToken)}`;
  const displayName = input.name?.trim() || "друг";
  const params: Record<string, string> = {
    name: displayName,
    email: input.email.trim().toLowerCase(),
    reset_link: resetUrl,
    site_url: SITE_URL
  };

  let result: NotisendResult;
  if (templateId) {
    result = await notisendSendTemplate(templateId, input.email, params);
  } else {
    if (!notisendFromEmail()) {
      console.error("[notisend] password reset: задайте NOTISEND_PASSWORD_RESET_TEMPLATE_ID или NOTISEND_FROM_EMAIL/EMAIL_FROM");
      return false;
    }
    result = await notisendSendRawMessage({
      to: input.email,
      subject: "Сброс пароля Lemnity",
      html: `<p>Здравствуйте, ${escapeHtml(displayName)}!</p>
<p>Чтобы задать новый пароль, перейдите по ссылке (действует ограниченное время):</p>
<p><a href="${escapeHtml(resetUrl)}">Сбросить пароль</a></p>
<p>Если вы не запрашивали сброс, просто проигнорируйте это письмо.</p>`,
      text: `Здравствуйте, ${displayName}!\n\nСсылка для сброса пароля:\n${resetUrl}\n\nЕсли вы не запрашивали сброс — проигнорируйте письмо.`
    });
  }

  if (!result.ok) {
    console.error("[notisend] password reset email failed:", result.detail);
    return false;
  }
  return true;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

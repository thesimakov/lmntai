/**
 * Ссылки для «Поделиться» / «Опубликовать» по превью из стрима (песочница Lemnity AI).
 * При появлении отдельного публичного deploy-URL из бэкенда — подставляйте его здесь.
 */

import { SITE_URL } from "@/lib/site";

/** Публичная страница на основном домене (NEXT_PUBLIC_SITE_URL) — работает там, где поддомен публикации не резолвится. */
export function buildCanonicalSharePageHref(sandboxId: string): string {
  return new URL(`/share/${encodeURIComponent(sandboxId)}`, `${SITE_URL}/`).href;
}

export function resolveShareablePreviewUrl(previewUrl: string | null, origin: string): string | null {
  if (!previewUrl?.trim()) return null;
  const raw = previewUrl.trim();
  try {
    if (raw.startsWith("http://") || raw.startsWith("https://")) {
      return new URL(raw).href;
    }
    return new URL(raw.startsWith("/") ? raw : `/${raw}`, origin).href;
  } catch {
    return null;
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Публичная страница превью: /share/{sandboxId} */
export function buildPublicSharePageUrl(origin: string, sandboxId: string): string {
  return new URL(`/share/${encodeURIComponent(sandboxId)}`, origin).href;
}

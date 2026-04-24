/**
 * Ссылки для «Поделиться» / «Опубликовать» по превью из стрима (песочница Lemnity AI).
 * При появлении отдельного публичного deploy-URL из бэкенда — подставляйте его здесь.
 */

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

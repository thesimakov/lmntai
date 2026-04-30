/**
 * Ссылки для «Поделиться» / «Опубликовать» по превью из стрима (песочница Lemnity AI).
 * При появлении отдельного публичного deploy-URL из бэкенда — подставляйте его здесь.
 */

import { PUBLISH_BUILTIN_BASE_DOMAIN } from "@/lib/publish-host";
import { SITE_URL } from "@/lib/site";

/** Страница открыта с хостом в зоне встроенной публикации (*.base / base) — https://slug.base может резолвиться через wildcard. */
export function originHostnameServesBuiltinPublishWildcard(hostname: string): boolean {
  const h = hostname.toLowerCase();
  const b = PUBLISH_BUILTIN_BASE_DOMAIN.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1") return false;
  return h === b || h.endsWith(`.${b}`);
}

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

/** Восстанавливает sandboxId / artifact_* из pathname превью, если событие моста не передало sandboxId явно */
export function deriveSandboxIdFromAppPreviewUrl(previewUrl: string | null | undefined): string | null {
  if (!previewUrl?.trim()) return null;
  const raw = previewUrl.trim();
  try {
    const pathOnly =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? new URL(raw).pathname
        : raw.startsWith("/")
          ? raw
          : `/${raw}`;
    const sandboxMatch = pathOnly.match(/^\/api\/sandbox\/([^/?#]+)/);
    if (sandboxMatch?.[1]) return decodeURIComponent(sandboxMatch[1]);
    const artifactMatch = pathOnly.match(/^\/api\/lemnity-ai\/artifacts\/([^/?#]+)/);
    if (artifactMatch?.[1]) return decodeURIComponent(artifactMatch[1]);
  } catch {
    return null;
  }
  return null;
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

/**
 * Рабочая ссылка для «Скопировать» / открыть: на localhost или чужом origin `https://{slug}.{base}`
 * часто даёт DNS error — тогда страница превью только по `/share/{sandboxId}` на текущем origin.
 */
export function buildBuiltinPublishBrowseUrl(
  origin: string,
  sandboxId: string | null,
  builtinHostFqdn: string
): string {
  if (!sandboxId) {
    return `https://${builtinHostFqdn}`;
  }
  try {
    const { hostname } = new URL(origin);
    if (originHostnameServesBuiltinPublishWildcard(hostname)) {
      return `https://${builtinHostFqdn}`;
    }
  } catch {
    /* fallthrough */
  }
  return buildPublicSharePageUrl(origin, sandboxId);
}

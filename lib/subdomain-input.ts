/**
 * Общее форматирование поддомена для UI (без Prisma — безопасно для клиента).
 */

export function formatSubdomainDraft(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/_/g, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-{2,}/g, "-");
}

/** Как перед отправкой на сервер: убираем дефисы по краям. */
export function finalizeSubdomain(raw: string): string {
  return formatSubdomainDraft(raw).replace(/^-+|-+$/g, "");
}

export function isCompleteSubdomainSlug(s: string): boolean {
  return s.length >= 3 && s.length <= 63;
}

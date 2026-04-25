/**
 * Встроенный адрес публикации: поддомен.{PUBLISH_BUILTIN_BASE_DOMAIN}
 * Переопределение: NEXT_PUBLIC_PUBLISH_BASE_DOMAIN
 */
export const PUBLISH_BUILTIN_BASE_DOMAIN =
  (typeof process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN === "string" &&
    process.env.NEXT_PUBLIC_PUBLISH_BASE_DOMAIN.trim()) ||
  "lemnity.com";

export function normalizePublishSubdomainLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function suggestPublishSubdomain(seedText: string | undefined, sandboxId: string | null): string {
  const fromSeed = normalizePublishSubdomainLabel(seedText ?? "");
  if (fromSeed) return fromSeed;
  const suffix = sandboxId ? sandboxId.slice(0, 6).toLowerCase() : "demo";
  return `project-${suffix}`;
}

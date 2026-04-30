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

/** Слишком «путьоподобные» или длинные slug из идеи/промпта дают адреса вроде src-app-tsx-… без смысла для публикации. */
export function shouldPreferProjectSuffixOverSeedSlug(normalizedSeedSlug: string): boolean {
  if (!normalizedSeedSlug) return false;
  if (normalizedSeedSlug.length > 28) return true;
  const parts = normalizedSeedSlug.split("-").filter(Boolean);
  if (parts.length >= 5) return true;
  const pathy = new Set(["src", "app", "components", "pages", "lib", "hooks", "ui", "tsx", "jsx", "ts", "js"]);
  for (let i = 0; i < parts.length; i++) {
    if (pathy.has(parts[i] ?? "")) return true;
  }
  return false;
}

export function suggestPublishSubdomain(seedText: string | undefined, sandboxId: string | null): string {
  const fromSeed = normalizePublishSubdomainLabel(seedText ?? "");
  if (fromSeed && !shouldPreferProjectSuffixOverSeedSlug(fromSeed)) return fromSeed;
  const suffix = sandboxId ? sandboxId.slice(0, 6).toLowerCase() : "demo";
  return `project-${suffix}`;
}

/** Нормализация полного хоста custom domain: app.example.com */
export function normalizePublishCustomHost(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  const noProto = raw.replace(/^https?:\/\//, "");
  const host = noProto.split("/")[0]?.split("?")[0]?.split("#")[0] ?? "";
  return host.replace(/:\d+$/, "").replace(/^\.+|\.+$/g, "");
}

/**
 * Безопасный HTML id для якорей (#ссылки внутри страницы).
 */
export function slugifyLnAnchorId(raw: string): string {
  let s = raw.trim().toLowerCase().replace(/\s+/g, "-");
  s = s.replace(/[^a-z0-9_-]/gi, "");
  s = s.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
  if (!s) return "block";
  if (/^[0-9]/.test(s)) s = `a-${s}`;
  return s.slice(0, 96);
}

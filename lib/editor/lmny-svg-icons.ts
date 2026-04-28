/**
 * Статический набор SVG из `public/svg-lmny/` (библиотека LMNY).
 * Значение `data-icon` в превью: публичный путь `/svg-lmny/<id>.svg`.
 */
export const LMNY_SVG_ICON_IDS = [
  "balloon",
  "basket",
  "fish",
  "flame",
  "flower",
  "game-controller",
  "hammer",
  "heart",
  "heart-dislike",
  "key",
  "moon",
  "nuclear",
  "paw",
  "pizza",
  "reload",
  "restaurant",
  "rocket",
  "send",
  "sparkles",
  "sparkles-1",
  "star",
  "sunny"
] as const;

export type LmnySvgIconId = (typeof LMNY_SVG_ICON_IDS)[number];

export function lmnySvgIconSrc(id: string): string {
  const base = id.trim().replace(/^\//, "").replace(/\.svg$/i, "");
  if (!base || !/^[\w-]+$/.test(base)) return "";
  return `/svg-lmny/${base}.svg`;
}

export function isLmnySvgIconPath(path: string): boolean {
  return path.trim().startsWith("/svg-lmny/") && path.endsWith(".svg");
}

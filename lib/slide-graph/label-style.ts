import type { SlideElementStyle, SlideTheme } from "./types";

export const LABEL_MIN_FONT_SIZE_PX = 15;

export const LABEL_RADIUS_PRESETS = [
  { id: "none", label: "0", px: 0 },
  { id: "sm", label: "8", px: 8 },
  { id: "md", label: "16", px: 16 },
  { id: "lg", label: "24", px: 24 },
  { id: "pill", label: "pill", px: 9999 },
] as const;

export function parseLabelFontSizePx(raw?: string): number {
  if (!raw?.trim()) return LABEL_MIN_FONT_SIZE_PX;
  const m = /^([\d.]+)(px|rem)?$/i.exec(raw.trim());
  if (!m) return LABEL_MIN_FONT_SIZE_PX;
  let px = Number(m[1]);
  if (m[2]?.toLowerCase() === "rem") px *= 16;
  if (!Number.isFinite(px)) return LABEL_MIN_FONT_SIZE_PX;
  return Math.max(LABEL_MIN_FONT_SIZE_PX, Math.round(px));
}

export function labelFontSizeToCss(px: number): string {
  return `${Math.max(LABEL_MIN_FONT_SIZE_PX, Math.round(px))}px`;
}

export function defaultLabelElementStyle(_theme: SlideTheme): SlideElementStyle {
  return {
    color: "#5a7a6a",
    backgroundColor: "#e9f3ec",
    borderRadius: "9999px",
    fontSize: labelFontSizeToCss(LABEL_MIN_FONT_SIZE_PX),
  };
}

export function parseLabelBorderRadiusPx(raw?: string): number {
  if (!raw?.trim()) return 9999;
  const m = /^([\d.]+)px$/i.exec(raw.trim());
  if (!m) return 9999;
  return Math.min(9999, Math.max(0, Number(m[1])));
}

export function labelBorderRadiusToCss(px: number): string {
  return `${px}px`;
}

export function labelStyleInlineCss(style: SlideElementStyle | undefined): string {
  if (!style) return "";
  const parts = [
    style.color ? `color:${style.color}` : "",
    style.backgroundColor ? `background:${style.backgroundColor}` : "",
    style.borderRadius ? `border-radius:${style.borderRadius}` : "",
    style.fontSize ? `font-size:${style.fontSize}` : "",
    style.fontWeight === "bold" ? "font-weight:700" : "",
    style.textAlign ? `text-align:${style.textAlign}` : "",
    style.opacity != null ? `opacity:${style.opacity}` : "",
  ].filter(Boolean);
  return parts.length ? ` style="${parts.join(";")}"` : "";
}

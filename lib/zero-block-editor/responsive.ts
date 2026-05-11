import type { ZbElement, ZbBreakpoint } from "./types";
import { ZB_BREAKPOINT_PRESETS } from "./breakpoints";

export interface EffectiveGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
  visible: boolean;
}

export interface EffectiveTypography {
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  color?: string;
}

export function getEffectiveTypography(el: ZbElement, bp: ZbBreakpoint): EffectiveTypography {
  if (bp === "desktop") return {};
  const override = el.responsive[bp] ?? {};
  const result: EffectiveTypography = {};
  if (override.fontSize !== undefined) result.fontSize = override.fontSize;
  if (override.fontFamily !== undefined) result.fontFamily = override.fontFamily;
  if (override.fontWeight !== undefined) result.fontWeight = override.fontWeight;
  if (override.lineHeight !== undefined) result.lineHeight = override.lineHeight;
  if (override.letterSpacing !== undefined) result.letterSpacing = override.letterSpacing;
  if (override.color !== undefined) result.color = override.color;
  return result;
}

// Reference desktop width for proportional scaling
const DESKTOP_WIDTH = ZB_BREAKPOINT_PRESETS["1200"].canvasWidth!; // 1200

export function getEffectiveGeometry(el: ZbElement, bp: ZbBreakpoint): EffectiveGeometry {
  if (bp === "desktop") {
    return { x: el.x, y: el.y, w: el.w, h: el.h, visible: el.visible };
  }

  const override = el.responsive[bp] ?? {};
  const preset = ZB_BREAKPOINT_PRESETS[bp];

  // If the user has set explicit x/w overrides, respect them fully
  const hasExplicit =
    override.x !== undefined ||
    override.y !== undefined ||
    override.w !== undefined ||
    override.h !== undefined;

  if (hasExplicit || !preset.canvasWidth) {
    return {
      x: override.x ?? el.x,
      y: override.y ?? el.y,
      w: override.w ?? el.w,
      h: override.h ?? el.h,
      visible: override.visible ?? el.visible,
    };
  }

  // No explicit override → auto-scale X and W proportionally to canvas width.
  // Y and H stay as-is (vertical layout doesn't scale the same way).
  const ratio = preset.canvasWidth / DESKTOP_WIDTH;
  return {
    x: Math.round(el.x * ratio),
    y: el.y,
    w: Math.max(16, Math.round(el.w * ratio)),
    h: el.h,
    visible: override.visible ?? el.visible,
  };
}

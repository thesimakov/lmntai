import type { ZbBreakpoint } from "./types";

export interface ZbBreakpointPreset {
  canvasWidth: number | null; // null = full viewport (desktop)
  columns: number;
  gridWidth: number; // centered grid zone width
}

// Standard column grid based on 1200px reference:
// desktop/1200: 12 cols (20px margin, 60px col, 40px gap)
// Smaller breakpoints: proportionally fewer columns
export const ZB_BREAKPOINT_PRESETS: Record<ZbBreakpoint, ZbBreakpointPreset> = {
  desktop: { canvasWidth: null, columns: 12, gridWidth: 1200 },
  "1200":  { canvasWidth: 1200, columns: 12, gridWidth: 1200 },
  "980":   { canvasWidth: 980,  columns: 8,  gridWidth: 940  },
  "640":   { canvasWidth: 640,  columns: 4,  gridWidth: 600  },
  "480":   { canvasWidth: 480,  columns: 4,  gridWidth: 440  },
  "320":   { canvasWidth: 320,  columns: 2,  gridWidth: 280  },
};

// Compute column width and gap width for a given column count and grid zone width.
// Uses proportional scaling from the 1200px/12-col reference layout.
const REF_TOTAL = 1200;
const REF_MARGIN = 20;
const REF_COL = 60;
const REF_GAP = 40;

export function computeColLayout(columns: number, gridWidth: number): {
  margin: number;
  colW: number;
  gapW: number;
} {
  const margin = Math.max(4, Math.round(REF_MARGIN * gridWidth / REF_TOTAL));
  const gapW = columns > 1 ? Math.max(8, Math.round(REF_GAP * gridWidth / REF_TOTAL)) : 0;
  const colW = Math.max(8, Math.round((gridWidth - 2 * margin - (columns - 1) * gapW) / columns));
  return { margin, colW, gapW };
}

/** Reference ratios for percentage-based CSS column layout (independent of canvas width). */
export const COL_MARGIN_PCT = (REF_MARGIN / REF_TOTAL) * 100;
export const COL_WIDTH_PCT = (REF_COL / REF_TOTAL) * 100;
export const COL_GAP_PCT = (REF_GAP / REF_TOTAL) * 100;

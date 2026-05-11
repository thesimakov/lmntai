import type { PageGridConfig } from "@/lib/lemnity-box-editor-schema";

/** Grid configuration for a Zero Block section. */
export interface ZeroBlockGridConfig {
  columns: number;
  marginPx: number;
  /** 0 aligns with standard 12-column page grid (no inter-column gutter). */
  gutterPx: number;
  visible: boolean;
  snapEnabled: boolean;
}

export const ZB_GRID_DEFAULTS: ZeroBlockGridConfig = {
  columns: 12,
  marginPx: 40,
  gutterPx: 0,   // matches standard page grid — no gutter
  visible: true,
  snapEnabled: true,
};

/** Convert PageGridConfig (page-level) to ZeroBlockGridConfig defaults. */
export function pageGridToZbDefaults(pg: PageGridConfig): ZeroBlockGridConfig {
  return { ...ZB_GRID_DEFAULTS, columns: pg.columns, marginPx: pg.marginPx, gutterPx: pg.gutterPx };
}

const ZB_ATTR_COLS = "data-ln-zb-cols";
const ZB_ATTR_MARGIN = "data-ln-zb-margin";
const ZB_ATTR_GUTTER = "data-ln-zb-gutter";
const ZB_ATTR_GRID = "data-ln-zb-grid";
const ZB_ATTR_SNAP = "data-ln-zb-snap";

export function readZbGridConfig(attrs: Record<string, string>): ZeroBlockGridConfig {
  const cols = parseInt(attrs[ZB_ATTR_COLS] ?? "", 10);
  const margin = parseInt(attrs[ZB_ATTR_MARGIN] ?? "", 10);
  const gutter = parseInt(attrs[ZB_ATTR_GUTTER] ?? "", 10);
  return {
    columns: Number.isFinite(cols) && cols > 0 ? Math.min(24, cols) : ZB_GRID_DEFAULTS.columns,
    marginPx: Number.isFinite(margin) && margin >= 0 ? margin : ZB_GRID_DEFAULTS.marginPx,
    gutterPx: Number.isFinite(gutter) && gutter >= 0 ? gutter : ZB_GRID_DEFAULTS.gutterPx,
    visible: attrs[ZB_ATTR_GRID] !== "off",
    snapEnabled: attrs[ZB_ATTR_SNAP] !== "off",
  };
}

export function zbGridConfigToAttrs(config: ZeroBlockGridConfig): Record<string, string> {
  return {
    [ZB_ATTR_COLS]: String(config.columns),
    [ZB_ATTR_MARGIN]: String(config.marginPx),
    [ZB_ATTR_GUTTER]: String(config.gutterPx),
    [ZB_ATTR_GRID]: config.visible ? "on" : "off",
    [ZB_ATTR_SNAP]: config.snapEnabled ? "on" : "off",
  };
}

export interface ZbColBound {
  start: number;
  end: number;
}

export function computeZbColumns(sectionWidth: number, cfg: ZeroBlockGridConfig): ZbColBound[] {
  const { columns, marginPx, gutterPx } = cfg;
  const inner = sectionWidth - 2 * marginPx;
  if (inner <= 0 || columns <= 0) return [];
  const colW = (inner - (columns - 1) * gutterPx) / columns;
  if (colW <= 0) return [];
  return Array.from({ length: columns }, (_, i) => ({
    start: Math.round(marginPx + i * (colW + gutterPx)),
    end: Math.round(marginPx + i * (colW + gutterPx) + colW),
  }));
}

const ZB_ROW_GRID_PX = 8;
const ZB_SNAP_THRESHOLD_PX = 8;

export function snapXToZbGrid(x: number, sectionWidth: number, cfg: ZeroBlockGridConfig): number {
  if (!cfg.snapEnabled) return x;
  const cols = computeZbColumns(sectionWidth, cfg);
  const candidates = [
    cfg.marginPx,
    sectionWidth - cfg.marginPx,
    Math.round(sectionWidth / 2),
    ...cols.flatMap((c) => [c.start, c.end]),
  ];
  let best = x;
  let bestDist = ZB_SNAP_THRESHOLD_PX;
  for (const pt of candidates) {
    const d = Math.abs(pt - x);
    if (d < bestDist) {
      bestDist = d;
      best = pt;
    }
  }
  return best;
}

export function snapYToZbGrid(y: number, snapEnabled: boolean): number {
  if (!snapEnabled) return y;
  return Math.round(y / ZB_ROW_GRID_PX) * ZB_ROW_GRID_PX;
}

export function pxToColSpan(
  x: number,
  w: number,
  sectionWidth: number,
  cfg: ZeroBlockGridConfig,
): { col: number; span: number } {
  const cols = computeZbColumns(sectionWidth, cfg);
  if (!cols.length) return { col: 1, span: 1 };

  let col = 1;
  let minStart = Infinity;
  cols.forEach((c, i) => {
    const d = Math.abs(c.start - x);
    if (d < minStart) {
      minStart = d;
      col = i + 1;
    }
  });

  const rightX = x + w;
  let endIdx = col - 1;
  let minEnd = Infinity;
  cols.forEach((c, i) => {
    const d = Math.abs(c.end - rightX);
    if (d < minEnd) {
      minEnd = d;
      endIdx = i;
    }
  });

  return { col, span: Math.max(1, endIdx - (col - 1) + 1) };
}

export function colSpanToPx(
  col: number,
  span: number,
  sectionWidth: number,
  cfg: ZeroBlockGridConfig,
): { x: number; w: number } {
  const cols = computeZbColumns(sectionWidth, cfg);
  const c0 = cols[Math.max(0, col - 1)];
  const c1 = cols[Math.min(col + span - 2, cols.length - 1)];
  if (!c0 || !c1) return { x: cfg.marginPx, w: Math.max(80, sectionWidth - 2 * cfg.marginPx) };
  return { x: c0.start, w: c1.end - c0.start };
}

// ── Page-level grid stored on canvas <html> element ──────────────────────────

const PAGE_ATTR_COLS = "data-ln-page-cols";
const PAGE_ATTR_MARGIN = "data-ln-page-margin";
const PAGE_ATTR_GUTTER = "data-ln-page-gutter";

/** Write page grid config to the canvas <html> element so all zero blocks can read it. */
export function writePageGridToDoc(htmlEl: HTMLElement, pg: PageGridConfig): void {
  htmlEl.setAttribute(PAGE_ATTR_COLS, String(pg.columns));
  htmlEl.setAttribute(PAGE_ATTR_MARGIN, String(pg.marginPx));
  htmlEl.setAttribute(PAGE_ATTR_GUTTER, String(pg.gutterPx));
}

/** Read page grid config from the canvas <html> element. Falls back to PAGE_GRID_DEFAULTS. */
export function readPageGridFromDoc(htmlEl: HTMLElement | null | undefined): PageGridConfig {
  if (!htmlEl) return { columns: 12, marginPx: 40, gutterPx: 0 };
  const cols = parseInt(htmlEl.getAttribute(PAGE_ATTR_COLS) ?? "", 10);
  const margin = parseInt(htmlEl.getAttribute(PAGE_ATTR_MARGIN) ?? "", 10);
  const gutter = parseInt(htmlEl.getAttribute(PAGE_ATTR_GUTTER) ?? "", 10);
  return {
    columns: Number.isFinite(cols) && cols > 0 ? cols : 12,
    marginPx: Number.isFinite(margin) && margin >= 0 ? margin : 40,
    gutterPx: Number.isFinite(gutter) && gutter >= 0 ? gutter : 0,
  };
}

/** Get the ZeroBlockGridConfig for a section, inheriting from page grid if no custom override. */
export function resolveZbGridConfig(
  sectionAttrs: Record<string, string>,
  pageGrid: PageGridConfig,
): ZeroBlockGridConfig {
  const hasCustomGrid = sectionAttrs["data-ln-zb-cols"] != null;
  if (!hasCustomGrid) {
    // Inherit page grid — zero block has no override
    return {
      ...pageGridToZbDefaults(pageGrid),
      visible: sectionAttrs["data-ln-zb-grid"] !== "off",
      snapEnabled: sectionAttrs["data-ln-zb-snap"] !== "off",
    };
  }
  return readZbGridConfig(sectionAttrs);
}

export const ZB_GRID_OVERLAY_STYLE_ID = "lemnity-zb-grid-overlay";

export function buildZbGridCss(blockId: string, sectionWidth: number, cfg: ZeroBlockGridConfig): string {
  if (!cfg.visible || sectionWidth <= 0) return "";
  const cols = computeZbColumns(sectionWidth, cfg);
  if (!cols.length) return "";

  const stops: string[] = [];
  let prev = 0;
  for (const col of cols) {
    if (col.start > prev) {
      stops.push(`transparent ${prev}px`, `transparent ${col.start}px`);
    }
    stops.push(`rgba(99,102,241,0.1) ${col.start}px`, `rgba(99,102,241,0.1) ${col.end}px`);
    prev = col.end;
  }
  if (prev < sectionWidth) {
    stops.push(`transparent ${prev}px`);
  }

  // Deduplicate consecutive identical stops
  const deduped = stops.filter((s, i, a) => i === 0 || s !== a[i - 1]);

  return `[data-ln-zero-id="${blockId}"] .lemnity-zero-canvas::before{content:"";position:absolute;inset:0;pointer-events:none;z-index:9998;background-image:linear-gradient(90deg,${deduped.join(",")});background-size:${sectionWidth}px 100%;background-repeat:no-repeat}
[data-ln-zero-id="${blockId}"][data-ln-zb-grid="on"] .lemnity-zero-canvas::after{content:"";position:absolute;top:0;bottom:0;left:${cfg.marginPx}px;right:${cfg.marginPx}px;pointer-events:none;z-index:9997;border-left:1px dashed rgba(99,102,241,0.4);border-right:1px dashed rgba(99,102,241,0.4)}
[data-ln-zero-id="${blockId}"][data-ln-zb-grid="off"] .lemnity-zero-canvas::before{content:none!important}`;
}

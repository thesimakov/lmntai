import type { ZbElement, ZbSnapGuide } from "./types";

const THRESHOLD = 5;

export interface ZbSnapResult {
  x: number;
  y: number;
  guides: ZbSnapGuide[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function computeZbSnap(
  moving: Rect,
  others: ZbElement[],
  canvasWidth: number,
  snapToGrid: boolean,
  snapToElements: boolean,
  gridSize = 8,
  columnPositions?: number[],
): ZbSnapResult {
  let { x, y } = moving;
  const guides: ZbSnapGuide[] = [];

  if (snapToGrid) {
    // Hard y snap — always land on row grid
    y = Math.round(y / gridSize) * gridSize;
    // Column-aligned x snap: try left edge then right edge against column boundaries
    if (columnPositions && columnPositions.length > 0) {
      let bestDist = THRESHOLD;
      for (const cp of columnPositions) {
        const dL = Math.abs(x - cp);
        if (dL < bestDist) { bestDist = dL; x = cp; }
        const dR = Math.abs((x + moving.w) - cp);
        if (dR < bestDist) { bestDist = dR; x = cp - moving.w; }
      }
    } else {
      // Fallback: 8px grid snap for x
      x = Math.round(x / gridSize) * gridSize;
    }
  }

  if (snapToElements) {
    const mL = x;
    const mR = x + moving.w;
    const mT = y;
    const mB = y + moving.h;
    const mCX = x + moving.w / 2;
    const mCY = y + moving.h / 2;

    for (const el of others) {
      const eL = el.x;
      const eR = el.x + el.w;
      const eT = el.y;
      const eB = el.y + el.h;
      const eCX = el.x + el.w / 2;
      const eCY = el.y + el.h / 2;

      // Vertical axis snaps (left edges, right edges, centers)
      const vCandidates: Array<{ moving: number; fixed: number }> = [
        { moving: mL, fixed: eL },
        { moving: mL, fixed: eR },
        { moving: mR, fixed: eL },
        { moving: mR, fixed: eR },
        { moving: mCX, fixed: eCX },
      ];
      for (const c of vCandidates) {
        if (Math.abs(c.moving - c.fixed) < THRESHOLD) {
          x += c.fixed - c.moving;
          guides.push({ orientation: "v", position: c.fixed });
          break;
        }
      }

      // Horizontal axis snaps
      const hCandidates: Array<{ moving: number; fixed: number }> = [
        { moving: mT, fixed: eT },
        { moving: mT, fixed: eB },
        { moving: mB, fixed: eT },
        { moving: mB, fixed: eB },
        { moving: mCY, fixed: eCY },
      ];
      for (const c of hCandidates) {
        if (Math.abs(c.moving - c.fixed) < THRESHOLD) {
          y += c.fixed - c.moving;
          guides.push({ orientation: "h", position: c.fixed });
          break;
        }
      }
    }

    // Canvas axis snaps: left, center, right
    const canvasCandidates: Array<{ moving: number; fixed: number; guide: ZbSnapGuide }> = [
      { moving: mL, fixed: 0, guide: { orientation: "v", position: 0 } },
      { moving: mCX, fixed: canvasWidth / 2, guide: { orientation: "v", position: canvasWidth / 2 } },
      { moving: mR, fixed: canvasWidth, guide: { orientation: "v", position: canvasWidth } },
    ];
    for (const c of canvasCandidates) {
      if (Math.abs(c.moving - c.fixed) < THRESHOLD) {
        x += c.fixed - c.moving;
        guides.push(c.guide);
      }
    }
  }

  return { x, y, guides };
}

export function computeZbResizeSnap(
  rect: Rect,
  others: ZbElement[],
  snapToGrid: boolean,
  gridSize = 8,
): Rect {
  if (!snapToGrid) return rect;
  return {
    x: Math.round(rect.x / gridSize) * gridSize,
    y: Math.round(rect.y / gridSize) * gridSize,
    w: Math.round(rect.w / gridSize) * gridSize,
    h: Math.round(rect.h / gridSize) * gridSize,
  };
}

import type { SlideElementFrame } from "./types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H } from "./freeform";

export const SNAP_GRID = 8;
export const SNAP_RADIUS = 6;

export interface SnapResult {
  snapped: number;
  guide: number | null;
}

export interface SnapCandidates {
  x: number[];
  y: number[];
}

export function snapValue(
  value: number,
  candidates: number[],
  gridSize: number,
  radius: number,
  altKey = false
): SnapResult {
  if (altKey) return { snapped: value, guide: null };

  // Prefer candidate snap over grid
  for (const c of candidates) {
    if (Math.abs(value - c) <= radius) return { snapped: c, guide: c };
  }

  // Grid snap
  const snapped = Math.round(value / gridSize) * gridSize;
  return { snapped, guide: null };
}

export function computeSnapGuides(others: SlideElementFrame[]): SnapCandidates {
  const x: number[] = [0, SLIDE_CANVAS_W / 2, SLIDE_CANVAS_W]; // canvas edges + center
  const y: number[] = [0, SLIDE_CANVAS_H / 2, SLIDE_CANVAS_H];

  for (const f of others) {
    x.push(f.x, f.x + f.w / 2, f.x + f.w);
    y.push(f.y, f.y + f.h / 2, f.y + f.h);
  }

  return { x, y };
}

export function snapFrame(
  frame: SlideElementFrame,
  others: SlideElementFrame[],
  altKey = false
): { frame: SlideElementFrame; guides: Array<{ axis: "x" | "y"; value: number }> } {
  const { x: cx, y: cy } = computeSnapGuides(others);
  const guides: Array<{ axis: "x" | "y"; value: number }> = [];

  const rx = snapValue(frame.x, cx, SNAP_GRID, SNAP_RADIUS, altKey);
  const ry = snapValue(frame.y, cy, SNAP_GRID, SNAP_RADIUS, altKey);

  if (rx.guide !== null) guides.push({ axis: "x", value: rx.guide });
  if (ry.guide !== null) guides.push({ axis: "y", value: ry.guide });

  return {
    frame: { ...frame, x: rx.snapped, y: ry.snapped },
    guides,
  };
}

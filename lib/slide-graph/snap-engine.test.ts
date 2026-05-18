import { describe, it, expect } from "vitest";
import { snapValue, computeSnapGuides, SNAP_GRID } from "./snap-engine";
import type { SlideElementFrame } from "./types";

describe("snapValue", () => {
  it("snaps to grid", () => {
    expect(snapValue(13, [], SNAP_GRID, 6)).toEqual({ snapped: 16, guide: null });
    expect(snapValue(17, [], SNAP_GRID, 6)).toEqual({ snapped: 16, guide: null });
  });

  it("snaps to candidate within radius over grid", () => {
    expect(snapValue(103, [100], SNAP_GRID, 6)).toEqual({ snapped: 100, guide: 100 });
  });

  it("grid snap when no candidate in radius", () => {
    expect(snapValue(103, [200], SNAP_GRID, 6)).toEqual({ snapped: 104, guide: null });
  });

  it("returns value unchanged when altKey suppresses snap", () => {
    expect(snapValue(13, [], SNAP_GRID, 6, true)).toEqual({ snapped: 13, guide: null });
  });
});

describe("computeSnapGuides", () => {
  const others: SlideElementFrame[] = [{ x: 100, y: 50, w: 200, h: 80, zIndex: 1 }];

  it("collects candidate x values from other element edges and centers", () => {
    const candidates = computeSnapGuides(others);
    expect(candidates.x).toContain(100);   // left edge
    expect(candidates.x).toContain(300);   // right edge
    expect(candidates.x).toContain(200);   // center
    expect(candidates.y).toContain(50);    // top
    expect(candidates.y).toContain(130);   // bottom
    expect(candidates.y).toContain(90);    // center
  });
});

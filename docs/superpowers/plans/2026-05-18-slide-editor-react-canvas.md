# Slide Editor React Canvas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace iframe-based slide editor with a React canvas (960×540, CSS-scale) with native drag, resize, snapping, context-aware properties panel, and quality scoring.

**Architecture:** CSS-scaled React canvas at fixed 960×540 coordinates. Two Zustand stores: `useSlideStore` (data + server sync via existing patch API) and `useEditorStore` (UI state). InteractionLayer overlaid on canvas handles pointer events. Existing `patch.ts` functions apply changes locally before syncing.

**Tech Stack:** React 19, Zustand, TypeScript strict, Tailwind, Vitest, existing `lib/slide-graph/patch.ts` + `freeform.ts`

---

## Task 1: Extend types + patch schema

**Files:**
- Modify: `lib/slide-graph/types.ts`
- Modify: `lib/slide-graph/patch.ts`

- [ ] **Add 3 fields to SlideElement and 5 tokens to SlideTheme**

In `lib/slide-graph/types.ts`, after `style?: SlideElementStyle;` add:

```ts
  name?: string
  locked?: boolean
  visible?: boolean
```

After `fontFamily: string;` in `SlideTheme` add:

```ts
  headingFont?: string
  secondaryColor?: string
  surfaceColor?: string
  borderRadius?: "none" | "sm" | "md" | "lg"
  spacing?: "compact" | "normal" | "spacious"
```

After `notes?: string;` in `Slide` add:

```ts
  transition?: SlideTransition
```

Add new interface after `SlideTheme`:

```ts
export interface SlideTransition {
  type: "none" | "fade" | "slide" | "zoom"
  duration?: number
  direction?: "left" | "right" | "up" | "down"
}
```

- [ ] **Extend slidePatchSchema in patch.ts**

After `highlighted: z.boolean().optional(),` in `slidePatchSchema` add:

```ts
  name: z.string().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
```

After `"highlighted",` in `PATCH_FIELD_KEYS` add:

```ts
  "name",
  "locked",
  "visible",
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit**

```bash
git add lib/slide-graph/types.ts lib/slide-graph/patch.ts
git commit -m "feat: extend SlideElement with name/locked/visible, SlideTheme tokens, SlideTransition"
```

---

## Task 2: Add 'react' variant to buildSlideDeckStyles

**Files:**
- Modify: `lib/slide-graph/slide-deck-styles.ts`

- [ ] **Add 'react' to the variant union**

Replace:
```ts
export type SlideStyleVariant = "deck" | "editor" | "embed";
```
With:
```ts
export type SlideStyleVariant = "deck" | "editor" | "embed" | "react";
```

- [ ] **Add scoped CSS output for react variant**

At the top of `buildSlideDeckStyles`, after destructuring `primary`/`accent`, add a new branch before `const core`:

```ts
  if (variant === "react") {
    // Returns CSS scoped to .lmnt-canvas-root — no body/html globals.
    // box-sizing and font are applied inline on the wrapper div instead.
    const scopedReset = `.lmnt-canvas-root *, .lmnt-canvas-root *::before, .lmnt-canvas-root *::after { box-sizing: border-box; margin: 0; padding: 0; }`;
    // Re-use the full deck CSS but strip the body and * global rules.
    const full = buildSlideDeckStyles(theme, "deck");
    const stripped = full
      .replace(/\*,\s*\*::before,\s*\*::after\s*\{[^}]*\}/g, "")
      .replace(/body\s*\{[^}]*\}/g, "");
    return `${scopedReset}\n${stripped}`;
  }
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add lib/slide-graph/slide-deck-styles.ts
git commit -m "feat: add react variant to buildSlideDeckStyles for in-document canvas"
```

---

## Task 3: Quality scorer

**Files:**
- Create: `lib/slide-graph/quality-scorer.ts`
- Create: `lib/slide-graph/quality-scorer.test.ts`

- [ ] **Write failing tests first**

Create `lib/slide-graph/quality-scorer.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { scoreSlide } from "./quality-scorer";
import type { Slide, SlideTheme } from "./types";

const theme: SlideTheme = {
  primaryColor: "#3b82f6",
  backgroundColor: "#ffffff",
  textColor: "#000000",
  fontFamily: "Inter",
};

const minimalSlide: Slide = {
  id: "s1",
  layout: "title",
  freeform: true,
  elements: [
    {
      id: "e1",
      type: "heading",
      content: "Hello",
      frame: { x: 56, y: 140, w: 640, h: 72, zIndex: 1 },
      style: { color: "#000000", fontSize: "42px" },
    },
    {
      id: "e2",
      type: "body",
      content: "World",
      frame: { x: 56, y: 240, w: 400, h: 80, zIndex: 2 },
      style: { fontSize: "16px" },
    },
  ],
};

describe("scoreSlide", () => {
  it("returns scores 0-100 for each metric", () => {
    const result = scoreSlide(minimalSlide, theme);
    expect(result.density).toBeGreaterThanOrEqual(0);
    expect(result.density).toBeLessThanOrEqual(100);
    expect(result.hierarchy).toBeGreaterThanOrEqual(0);
    expect(result.balance).toBeGreaterThanOrEqual(0);
    expect(result.readability).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it("gives high hierarchy score when heading is present and larger than body", () => {
    const result = scoreSlide(minimalSlide, theme);
    expect(result.hierarchy).toBeGreaterThan(60);
  });

  it("gives low density score for empty slide", () => {
    const empty: Slide = { id: "s2", layout: "blank", elements: [] };
    const result = scoreSlide(empty, theme);
    expect(result.density).toBeLessThan(30);
  });

  it("penalises density when elements fill over 65% of canvas", () => {
    const crowded: Slide = {
      id: "s3",
      layout: "title",
      freeform: true,
      elements: Array.from({ length: 6 }, (_, i) => ({
        id: `e${i}`,
        type: "body" as const,
        content: "text",
        frame: { x: i * 160, y: 0, w: 160, h: 540, zIndex: i },
      })),
    };
    const result = scoreSlide(crowded, theme);
    expect(result.density).toBeLessThan(50);
  });
});
```

- [ ] **Run to confirm failure**

```bash
npx vitest run lib/slide-graph/quality-scorer.test.ts
```

Expected: FAIL — `scoreSlide` not found.

- [ ] **Implement quality-scorer.ts**

Create `lib/slide-graph/quality-scorer.ts`:

```ts
import type { Slide, SlideTheme } from "./types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, defaultElementFrame } from "./freeform";

export interface SlideQualityScore {
  density: number
  hierarchy: number
  balance: number
  readability: number
  total: number
}

function parsePx(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v) || 0;
}

function elementArea(el: { frame?: { x: number; y: number; w: number; h: number } }, idx: number, type: string): number {
  const f = el.frame ?? defaultElementFrame(idx, type as never);
  return f.w * f.h;
}

function scoreDensity(slide: Slide): number {
  if (slide.elements.length === 0) return 10;
  const totalArea = slide.elements.reduce((sum, el, i) => sum + elementArea(el, i, el.type), 0);
  const canvasArea = SLIDE_CANVAS_W * SLIDE_CANVAS_H;
  const ratio = totalArea / canvasArea;
  if (ratio < 0.05) return 10;
  if (ratio < 0.20) return 50 + (ratio - 0.05) / 0.15 * 30;
  if (ratio <= 0.65) return 80 + (1 - Math.abs(ratio - 0.42) / 0.23) * 20;
  return Math.max(0, 80 - (ratio - 0.65) / 0.35 * 80);
}

function scoreHierarchy(slide: Slide): number {
  const headings = slide.elements.filter((e) => e.type === "heading");
  if (headings.length === 0) return 20;
  let score = 60;
  if (headings.length === 1) score += 20;
  const headingSize = parsePx(headings[0]?.style?.fontSize) || 42;
  const bodyEls = slide.elements.filter((e) => e.type === "body" || e.type === "subheading");
  if (bodyEls.length > 0) {
    const bodySize = parsePx(bodyEls[0]?.style?.fontSize) || 16;
    if (headingSize / bodySize >= 1.4) score += 20;
  } else {
    score += 10;
  }
  return Math.min(100, score);
}

function scoreBalance(slide: Slide): number {
  if (slide.elements.length === 0) return 50;
  const centerX = SLIDE_CANVAS_W / 2;
  const centerY = SLIDE_CANVAS_H / 2;
  let sumX = 0, sumY = 0, totalW = 0;
  slide.elements.forEach((el, i) => {
    const f = el.frame ?? defaultElementFrame(i, el.type);
    const cx = f.x + f.w / 2;
    const cy = f.y + f.h / 2;
    sumX += cx * f.w;
    sumY += cy * f.h;
    totalW += f.w;
  });
  if (totalW === 0) return 50;
  const massCx = sumX / totalW;
  const massCy = sumY / totalW;
  const dxRatio = Math.abs(massCx - centerX) / centerX;
  const dyRatio = Math.abs(massCy - centerY) / centerY;
  const drift = (dxRatio + dyRatio) / 2;
  return Math.max(0, Math.round(100 - drift * 200));
}

function scoreReadability(slide: Slide, theme: SlideTheme): number {
  let score = 100;
  const headings = slide.elements.filter((e) => e.type === "heading");
  const bodies = slide.elements.filter((e) => e.type === "body");
  if (headings.length > 0) {
    const sz = parsePx(headings[0]?.style?.fontSize) || 42;
    if (sz < 28) score -= 30;
  }
  if (bodies.length > 0) {
    const sz = parsePx(bodies[0]?.style?.fontSize) || 16;
    if (sz < 14) score -= 20;
  }
  // basic contrast: if text color same as bg, penalise
  const tc = (theme.textColor ?? "").toLowerCase();
  const bg = (theme.backgroundColor ?? "").toLowerCase();
  if (tc === bg) score -= 40;
  return Math.max(0, Math.min(100, score));
}

export function scoreSlide(slide: Slide, theme: SlideTheme): SlideQualityScore {
  const density = Math.round(scoreDensity(slide));
  const hierarchy = Math.round(scoreHierarchy(slide));
  const balance = Math.round(scoreBalance(slide));
  const readability = Math.round(scoreReadability(slide, theme));
  const total = Math.round(density * 0.25 + hierarchy * 0.35 + balance * 0.20 + readability * 0.20);
  return { density, hierarchy, balance, readability, total };
}
```

- [ ] **Run tests — expect pass**

```bash
npx vitest run lib/slide-graph/quality-scorer.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Commit**

```bash
git add lib/slide-graph/quality-scorer.ts lib/slide-graph/quality-scorer.test.ts
git commit -m "feat: add slide quality scorer (density, hierarchy, balance, readability)"
```

---

## Task 4: Snap engine

**Files:**
- Create: `lib/slide-graph/snap-engine.ts`
- Create: `lib/slide-graph/snap-engine.test.ts`

- [ ] **Write failing tests**

Create `lib/slide-graph/snap-engine.test.ts`:

```ts
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
```

- [ ] **Run to confirm failure**

```bash
npx vitest run lib/slide-graph/snap-engine.test.ts
```

Expected: FAIL.

- [ ] **Implement snap-engine.ts**

Create `lib/slide-graph/snap-engine.ts`:

```ts
import type { SlideElementFrame } from "./types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H } from "./freeform";

export const SNAP_GRID = 8;
export const SNAP_RADIUS = 6;

export interface SnapResult {
  snapped: number
  guide: number | null
}

export interface SnapCandidates {
  x: number[]
  y: number[]
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
```

- [ ] **Run tests — expect pass**

```bash
npx vitest run lib/slide-graph/snap-engine.test.ts
```

Expected: all tests PASS.

- [ ] **Commit**

```bash
git add lib/slide-graph/snap-engine.ts lib/slide-graph/snap-engine.test.ts
git commit -m "feat: add snap engine (grid snap, element edge/center snap, canvas guides)"
```

---

## Task 5: useEditorStore

**Files:**
- Create: `lib/stores/use-editor-store.ts`

- [ ] **Create the store**

```ts
import { create } from "zustand";

export interface SnapGuide {
  axis: "x" | "y"
  value: number
}

interface EditorState {
  activeSlideIndex: number
  selectedElemId: string | null
  leftTab: "slides" | "layers"
  rightMode: "props" | "slide" | "theme" | "notes"
  zoom: number
  isDragging: boolean
  snapGuides: SnapGuide[]
  scale: number

  setActiveSlideIndex: (i: number) => void
  setSelectedElemId: (id: string | null) => void
  setLeftTab: (tab: "slides" | "layers") => void
  setRightMode: (mode: "props" | "slide" | "theme" | "notes") => void
  setZoom: (z: number) => void
  setIsDragging: (v: boolean) => void
  setSnapGuides: (guides: SnapGuide[]) => void
  setScale: (s: number) => void
}

export const useEditorStore = create<EditorState>((set) => ({
  activeSlideIndex: 0,
  selectedElemId: null,
  leftTab: "slides",
  rightMode: "props",
  zoom: 1,
  isDragging: false,
  snapGuides: [],
  scale: 1,

  setActiveSlideIndex: (i) => set({ activeSlideIndex: i, selectedElemId: null }),
  setSelectedElemId: (id) => set({ selectedElemId: id }),
  setLeftTab: (tab) => set({ leftTab: tab }),
  setRightMode: (mode) => set({ rightMode: mode }),
  setZoom: (z) => set({ zoom: Math.max(0.25, Math.min(3, z)) }),
  setIsDragging: (v) => set({ isDragging: v }),
  setSnapGuides: (guides) => set({ snapGuides: guides }),
  setScale: (s) => set({ scale: s }),
}));
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add lib/stores/use-editor-store.ts
git commit -m "feat: add useEditorStore for slide editor UI state"
```

---

## Task 6: useSlideStore

**Files:**
- Create: `lib/stores/use-slide-store.ts`

- [ ] **Create the store**

```ts
import { create } from "zustand";
import type { SlideGraph, SlideElement, SlideElementFrame, SlideBackground } from "@/lib/slide-graph/types";
import {
  applySlidePatches,
  applySlideBackgroundPatch,
  applyAddElementPatch,
  applyDeleteElementPatch,
  applyReorderElementsPatch,
  applyInitElementFramesPatch,
} from "@/lib/slide-graph/patch";
import { clampFrame, defaultElementFrame } from "@/lib/slide-graph/freeform";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

interface SlideStoreState {
  graph: SlideGraph
  projectId: string

  init: (projectId: string, graph: SlideGraph) => void
  setGraph: (graph: SlideGraph) => void

  updateElement: (slideId: string, elemId: string, patch: Partial<SlideElement>) => void
  moveElement: (slideId: string, elemId: string, x: number, y: number) => void
  resizeElement: (slideId: string, elemId: string, frame: SlideElementFrame) => void
  updateBackground: (slideId: string, bg: SlideBackground) => void
  addElement: (slideId: string, element: SlideElement) => void
  deleteElement: (slideId: string, elemId: string) => void
  reorderElements: (slideId: string, elemIds: string[]) => void
  ensureFrames: (slideId: string) => void
}

async function savePatch(projectId: string, body: unknown) {
  await fetch(`/api/projects/${projectId}/slides/patch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function scheduleSave(projectId: string, body: unknown) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void savePatch(projectId, body), 800);
}

export const useSlideStore = create<SlideStoreState>((set, get) => ({
  graph: { version: 1, meta: { title: "", language: "ru", theme: { primaryColor: "#3b82f6", backgroundColor: "#ffffff", textColor: "#1a1a2e", fontFamily: "Inter" }, generatedAt: "" }, slides: [] },
  projectId: "",

  init: (projectId, graph) => set({ projectId, graph }),
  setGraph: (graph) => set({ graph }),

  updateElement: (slideId, elemId, patch) => {
    const { graph, projectId } = get();
    const next = applySlidePatches(graph, [{ slideId, elemId, ...patch }]);
    set({ graph: next });
    scheduleSave(projectId, { patches: [{ slideId, elemId, ...patch }] });
  },

  moveElement: (slideId, elemId, x, y) => {
    const { graph, projectId } = get();
    const slide = graph.slides.find((s) => s.id === slideId);
    const el = slide?.elements.find((e) => e.id === elemId);
    if (!el) return;
    const frame = clampFrame({ ...(el.frame ?? defaultElementFrame(0, el.type)), x, y });
    const next = applySlidePatches(graph, [{ slideId, elemId, frame }]);
    set({ graph: { ...next, slides: next.slides.map((s) => s.id === slideId ? { ...s, freeform: true } : s) } });
    scheduleSave(projectId, { patches: [{ slideId, elemId, frame }] });
  },

  resizeElement: (slideId, elemId, frame) => {
    const { graph, projectId } = get();
    const clamped = clampFrame(frame);
    const next = applySlidePatches(graph, [{ slideId, elemId, frame: clamped }]);
    set({ graph: { ...next, slides: next.slides.map((s) => s.id === slideId ? { ...s, freeform: true } : s) } });
    scheduleSave(projectId, { patches: [{ slideId, elemId, frame: clamped }] });
  },

  updateBackground: (slideId, bg) => {
    const { graph, projectId } = get();
    const next = applySlideBackgroundPatch(graph, slideId, bg);
    set({ graph: next });
    scheduleSave(projectId, { slideBackground: { slideId, background: bg } });
  },

  addElement: (slideId, element) => {
    const { graph, projectId } = get();
    const next = applyAddElementPatch(graph, slideId, element);
    set({ graph: next });
    scheduleSave(projectId, { addElement: { slideId, element } });
  },

  deleteElement: (slideId, elemId) => {
    const { graph, projectId } = get();
    const next = applyDeleteElementPatch(graph, slideId, elemId);
    set({ graph: next });
    scheduleSave(projectId, { deleteElement: { slideId, elemId } });
  },

  reorderElements: (slideId, elemIds) => {
    const { graph, projectId } = get();
    const next = applyReorderElementsPatch(graph, slideId, elemIds);
    set({ graph: next });
    scheduleSave(projectId, { reorderElements: { slideId, elemIds } });
  },

  ensureFrames: (slideId) => {
    const { graph } = get();
    const slide = graph.slides.find((s) => s.id === slideId);
    if (!slide) return;
    const frames = slide.elements.map((el, i) => ({
      elemId: el.id,
      frame: el.frame ?? defaultElementFrame(i, el.type),
    }));
    const next = applyInitElementFramesPatch(graph, slideId, frames);
    set({ graph: next });
    // No server call — frames are initialised client-side only until next element edit
  },
}));
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add lib/stores/use-slide-store.ts
git commit -m "feat: add useSlideStore with local-first patch ops and debounced server sync"
```

---

## Task 7: SlideElementRenderer (React)

**Files:**
- Create: `components/playground/slides/slide-element-renderer.tsx`

- [ ] **Create the component**

```tsx
"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { cn } from "@/lib/utils";

function esc(s: unknown): string {
  if (typeof s !== "string") return "";
  return s;
}

export function SlideElementRenderer({ el }: { el: SlideElement }) {
  const style: React.CSSProperties = {
    ...(el.style?.color ? { color: el.style.color } : {}),
    ...(el.style?.fontSize ? { fontSize: el.style.fontSize } : {}),
    ...(el.style?.fontWeight === "bold" ? { fontWeight: 700 } : {}),
    ...(el.style?.italic ? { fontStyle: "italic" } : {}),
    ...(el.style?.textAlign ? { textAlign: el.style.textAlign } : {}),
    ...(el.style?.opacity != null ? { opacity: el.style.opacity } : {}),
  };

  switch (el.type) {
    case "heading":
      return <h2 className="lmnt-slide__heading" data-lmnt-elem-id={el.id} style={style}>{esc(el.content)}</h2>;

    case "subheading":
      return <p className="lmnt-slide__subheading" data-lmnt-elem-id={el.id} style={style}>{esc(el.content)}</p>;

    case "body":
      return <p className="lmnt-slide__body" data-lmnt-elem-id={el.id} style={style}>{esc(el.content)}</p>;

    case "bullet-list":
      return (
        <ul className="lmnt-slide__bullets" data-lmnt-elem-id={el.id} style={style}>
          {(el.items ?? []).map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );

    case "image":
      return <img className="lmnt-slide__image" src={el.src ?? ""} alt={el.alt ?? ""} data-lmnt-elem-id={el.id} style={style} />;

    case "quote":
      return <blockquote className="lmnt-slide__quote" data-lmnt-elem-id={el.id} style={style}>{esc(el.content)}</blockquote>;

    case "caption":
      return <p className="lmnt-slide__caption" data-lmnt-elem-id={el.id} style={style}>{esc(el.content)}</p>;

    case "label":
      return <span className="lmnt-slide__label" data-lmnt-elem-id={el.id} style={style}>{esc(el.content)}</span>;

    case "metric-card":
      return (
        <div className="lmnt-card lmnt-metric-card" data-lmnt-elem-id={el.id} style={style}>
          <p className="lmnt-metric-card__label" style={el.style?.labelColor ? { color: el.style.labelColor } : undefined}>
            {esc(el.label ?? el.content)}
          </p>
          <p className="lmnt-metric-card__description" style={el.style?.descriptionColor ? { color: el.style.descriptionColor } : undefined}>
            {esc(el.description)}
          </p>
        </div>
      );

    case "stat-number":
      return (
        <div className="lmnt-stat-number" data-lmnt-elem-id={el.id} style={style}>
          <span className="lmnt-stat-number__value" style={el.style?.valueColor ? { color: el.style.valueColor } : undefined}>{esc(el.value)}</span>
          {el.change && <span className="lmnt-stat-number__change" style={el.style?.changeColor ? { color: el.style.changeColor } : undefined}>{esc(el.change)}</span>}
          <span className="lmnt-stat-number__label" style={el.style?.labelColor ? { color: el.style.labelColor } : undefined}>{esc(el.label)}</span>
        </div>
      );

    case "feature-card":
      return (
        <div className="lmnt-card lmnt-feature-card" data-lmnt-elem-id={el.id} style={style}>
          {el.badge && <span className="lmnt-feature-card__badge">{esc(el.badge)}</span>}
          <p className="lmnt-feature-card__title">{esc(el.content ?? el.label)}</p>
          <p className="lmnt-feature-card__desc">{esc(el.description)}</p>
        </div>
      );

    case "step-card":
      return (
        <div className="lmnt-card lmnt-step-card" data-lmnt-elem-id={el.id} style={style}>
          <div className="lmnt-step-card__num">{String(el.stepNumber ?? "")}</div>
          <p className="lmnt-step-card__title">{esc(el.content ?? el.label)}</p>
          <p className="lmnt-step-card__desc">{esc(el.description)}</p>
        </div>
      );

    case "pricing-card":
      return (
        <div className={cn("lmnt-card lmnt-pricing-card", el.popular && "lmnt-pricing-card--popular")} data-lmnt-elem-id={el.id} style={style}>
          <p className="lmnt-pricing-card__plan">{esc(el.planName ?? el.content)}</p>
          {el.popular && <span className="lmnt-pricing-card__badge">ПОПУЛЯРНЫЙ</span>}
          <p className="lmnt-pricing-card__price">{esc(el.price)}<span className="lmnt-pricing-card__period"> {esc(el.period)}</span></p>
          <ul className="lmnt-pricing-card__feats">
            {(el.features ?? []).map((f, i) => <li key={i} className="lmnt-pricing-card__feat">{f}</li>)}
          </ul>
        </div>
      );

    case "timeline-col":
      return (
        <div className={cn("lmnt-timeline-col", el.highlighted && "lmnt-timeline-col--highlighted")} data-lmnt-elem-id={el.id} style={style}>
          <span className="lmnt-timeline-col__period">{esc(el.period ?? el.label)}</span>
          <p className="lmnt-timeline-col__title">{esc(el.content ?? el.planName)}</p>
          <ul className="lmnt-timeline-col__items">
            {(el.items ?? []).map((item, i) => <li key={i} className="lmnt-timeline-col__item">{item}</li>)}
          </ul>
        </div>
      );

    default:
      return <div data-lmnt-elem-id={el.id}>{esc((el as SlideElement).content ?? "")}</div>;
  }
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/slide-element-renderer.tsx
git commit -m "feat: add SlideElementRenderer React component (replaces HTML string renderer for canvas)"
```

---

## Task 8: SlideCanvas

**Files:**
- Create: `components/playground/slides/slide-canvas.tsx`

- [ ] **Create the component**

```tsx
"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Slide, SlideTheme } from "@/lib/slide-graph/types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, defaultElementFrame } from "@/lib/slide-graph/freeform";
import { buildSlideDeckStyles } from "@/lib/slide-graph/slide-deck-styles";
import { SlideElementRenderer } from "./slide-element-renderer";
import { useEditorStore } from "@/lib/stores/use-editor-store";

interface SlideCanvasProps {
  slide: Slide
  theme: SlideTheme
  containerRef: React.RefObject<HTMLDivElement | null>
  onSelectElement: (elemId: string) => void
  onDeselectElement: () => void
  selectedElemId: string | null
}

export function SlideCanvas({
  slide,
  theme,
  containerRef,
  onSelectElement,
  onDeselectElement,
  selectedElemId,
}: SlideCanvasProps) {
  const styleId = "lmnt-canvas-styles";
  const setScale = useEditorStore((s) => s.setScale);
  const zoom = useEditorStore((s) => s.zoom);

  // Inject scoped CSS once per theme change
  useEffect(() => {
    let tag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = styleId;
      document.head.appendChild(tag);
    }
    tag.textContent = buildSlideDeckStyles(theme, "react");
  }, [theme]);

  // Update scale on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? el.clientWidth;
      setScale((w / SLIDE_CANVAS_W) * zoom);
    });
    obs.observe(el);
    setScale((el.clientWidth / SLIDE_CANVAS_W) * zoom);
    return () => obs.disconnect();
  }, [containerRef, setScale, zoom]);

  const scale = useEditorStore((s) => s.scale);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDeselectElement();
    },
    [onDeselectElement]
  );

  const backgroundStyle: React.CSSProperties = slide.background?.gradient
    ? { background: slide.background.gradient }
    : {
        backgroundColor: slide.background?.color ?? theme.backgroundColor,
        ...(slide.background?.image
          ? { backgroundImage: `url(${slide.background.image})`, backgroundSize: "cover" }
          : {}),
      };

  return (
    <div
      className="lmnt-canvas-root"
      style={{
        width: SLIDE_CANVAS_W,
        height: SLIDE_CANVAS_H,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        position: "relative",
        flexShrink: 0,
      }}
      onClick={handleCanvasClick}
    >
      {/* Background */}
      <div
        className="lmnt-slide"
        style={{ position: "absolute", inset: 0, ...backgroundStyle }}
      />
      {/* Overlay */}
      {slide.background?.image && slide.background.overlay != null && (
        <div
          className="lmnt-slide__overlay"
          style={{ background: `rgba(0,0,0,${slide.background.overlay})` }}
        />
      )}
      {/* Elements */}
      {slide.elements.map((el, i) => {
        if (el.visible === false) return null;
        const frame = el.frame ?? defaultElementFrame(i, el.type);
        const isSelected = el.id === selectedElemId;
        return (
          <div
            key={el.id}
            data-lmnt-frame-id={el.id}
            style={{
              position: "absolute",
              left: frame.x,
              top: frame.y,
              width: frame.w,
              height: frame.h,
              zIndex: frame.zIndex ?? i + 1,
              outline: isSelected ? "2px solid #3b82f6" : undefined,
              outlineOffset: isSelected ? "2px" : undefined,
              cursor: el.locked ? "default" : "grab",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
            onPointerDown={(e) => {
              if (el.locked) return;
              e.stopPropagation();
              onSelectElement(el.id);
            }}
          >
            <SlideElementRenderer el={el} />
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/slide-canvas.tsx
git commit -m "feat: add SlideCanvas — React canvas with CSS-scale and scoped styles"
```

---

## Task 9: InteractionLayer (drag + resize)

**Files:**
- Create: `components/playground/slides/interaction-layer.tsx`

- [ ] **Create the component**

```tsx
"use client";

import { useCallback, useRef } from "react";
import type { SlideElement, SlideElementFrame } from "@/lib/slide-graph/types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, clampFrame, defaultElementFrame } from "@/lib/slide-graph/freeform";
import { snapFrame } from "@/lib/slide-graph/snap-engine";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";

type Handle = "tl" | "tr" | "bl" | "br" | "tm" | "bm" | "ml" | "mr";

const HANDLE_CURSORS: Record<Handle, string> = {
  tl: "nw-resize", tr: "ne-resize", bl: "sw-resize", br: "se-resize",
  tm: "n-resize", bm: "s-resize", ml: "w-resize", mr: "e-resize",
};

function applyResizeHandle(
  orig: SlideElementFrame,
  handle: Handle,
  dx: number,
  dy: number
): SlideElementFrame {
  let { x, y, w, h } = orig;
  if (handle.includes("l")) { x += dx; w -= dx; }
  if (handle.includes("r")) { w += dx; }
  if (handle.includes("t")) { y += dy; h -= dy; }
  if (handle.includes("b")) { h += dy; }
  return clampFrame({ ...orig, x, y, w: Math.max(24, w), h: Math.max(24, h) });
}

interface InteractionLayerProps {
  slide: { id: string; elements: SlideElement[] }
  selectedElemId: string | null
}

export function InteractionLayer({ slide, selectedElemId }: InteractionLayerProps) {
  const scale = useEditorStore((s) => s.scale);
  const setSnapGuides = useEditorStore((s) => s.setSnapGuides);
  const setIsDragging = useEditorStore((s) => s.setIsDragging);
  const moveElement = useSlideStore((s) => s.moveElement);
  const resizeElement = useSlideStore((s) => s.resizeElement);

  const dragRef = useRef<{
    type: "move" | Handle
    startClientX: number
    startClientY: number
    origFrame: SlideElementFrame
    elemId: string
    slideId: string
    moved: boolean
  } | null>(null);

  const selectedEl = slide.elements.find((e) => e.id === selectedElemId) ?? null;
  const selectedFrame = selectedEl
    ? (selectedEl.frame ?? defaultElementFrame(
        slide.elements.indexOf(selectedEl),
        selectedEl.type
      ))
    : null;

  const otherFrames = slide.elements
    .filter((e) => e.id !== selectedElemId && e.frame)
    .map((e) => e.frame!);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, type: "move" | Handle) => {
      if (!selectedEl || !selectedFrame) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        type,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origFrame: { ...selectedFrame },
        elemId: selectedEl.id,
        slideId: slide.id,
        moved: false,
      };
      setIsDragging(true);
    },
    [selectedEl, selectedFrame, slide.id, setIsDragging]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rawDx = (e.clientX - d.startClientX) / scale;
      const rawDy = (e.clientY - d.startClientY) / scale;
      if (!d.moved && Math.hypot(rawDx, rawDy) < 4 / scale) return;
      d.moved = true;

      let newFrame: SlideElementFrame;
      if (d.type === "move") {
        const tentative = clampFrame({
          ...d.origFrame,
          x: d.origFrame.x + rawDx,
          y: d.origFrame.y + rawDy,
        });
        const { frame, guides } = snapFrame(tentative, otherFrames, e.altKey);
        newFrame = frame;
        setSnapGuides(guides);
      } else {
        newFrame = applyResizeHandle(d.origFrame, d.type, rawDx, rawDy);
        setSnapGuides([]);
      }

      // Optimistic local update via store
      useSlideStore.getState().resizeElement(d.slideId, d.elemId, newFrame);
    },
    [scale, otherFrames, setSnapGuides]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    setSnapGuides([]);
  }, [setIsDragging, setSnapGuides]);

  if (!selectedEl || !selectedFrame) return null;

  const HANDLE_SIZE = 8;
  const mid = (a: number, b: number) => a + b / 2 - HANDLE_SIZE / 2;

  const handles: { id: Handle; left: number; top: number }[] = [
    { id: "tl", left: selectedFrame.x - HANDLE_SIZE / 2, top: selectedFrame.y - HANDLE_SIZE / 2 },
    { id: "tr", left: selectedFrame.x + selectedFrame.w - HANDLE_SIZE / 2, top: selectedFrame.y - HANDLE_SIZE / 2 },
    { id: "bl", left: selectedFrame.x - HANDLE_SIZE / 2, top: selectedFrame.y + selectedFrame.h - HANDLE_SIZE / 2 },
    { id: "br", left: selectedFrame.x + selectedFrame.w - HANDLE_SIZE / 2, top: selectedFrame.y + selectedFrame.h - HANDLE_SIZE / 2 },
    { id: "tm", left: mid(selectedFrame.x, selectedFrame.w), top: selectedFrame.y - HANDLE_SIZE / 2 },
    { id: "bm", left: mid(selectedFrame.x, selectedFrame.w), top: selectedFrame.y + selectedFrame.h - HANDLE_SIZE / 2 },
    { id: "ml", left: selectedFrame.x - HANDLE_SIZE / 2, top: mid(selectedFrame.y, selectedFrame.h) },
    { id: "mr", left: selectedFrame.x + selectedFrame.w - HANDLE_SIZE / 2, top: mid(selectedFrame.y, selectedFrame.h) },
  ];

  return (
    <div
      style={{ position: "absolute", inset: 0, pointerEvents: "none", width: SLIDE_CANVAS_W, height: SLIDE_CANVAS_H }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Drag overlay on selected element */}
      <div
        style={{
          position: "absolute",
          left: selectedFrame.x,
          top: selectedFrame.y,
          width: selectedFrame.w,
          height: selectedFrame.h,
          cursor: "grab",
          pointerEvents: "all",
          zIndex: 1000,
        }}
        onPointerDown={(e) => onPointerDown(e, "move")}
      />

      {/* Resize handles */}
      {handles.map(({ id, left, top }) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left,
            top,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: "#fff",
            border: "1.5px solid #3b82f6",
            borderRadius: 2,
            cursor: HANDLE_CURSORS[id],
            pointerEvents: "all",
            zIndex: 1001,
            boxSizing: "border-box",
          }}
          onPointerDown={(e) => onPointerDown(e, id)}
        />
      ))}
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/interaction-layer.tsx
git commit -m "feat: add InteractionLayer with drag-to-move, 8-handle resize, and snap integration"
```

---

## Task 10: SnapGuides + FloatingToolbar

**Files:**
- Create: `components/playground/slides/snap-guides.tsx`
- Create: `components/playground/slides/floating-toolbar.tsx`

- [ ] **Create snap-guides.tsx**

```tsx
"use client";

import type { SnapGuide } from "@/lib/stores/use-editor-store";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H } from "@/lib/slide-graph/freeform";

export function SnapGuides({ guides }: { guides: SnapGuide[] }) {
  if (guides.length === 0) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999, width: SLIDE_CANVAS_W, height: SLIDE_CANVAS_H }}>
      {guides.map((g, i) =>
        g.axis === "x" ? (
          <div key={i} style={{ position: "absolute", left: g.value, top: 0, width: 1, height: SLIDE_CANVAS_H, background: "rgba(59,130,246,0.7)" }} />
        ) : (
          <div key={i} style={{ position: "absolute", top: g.value, left: 0, height: 1, width: SLIDE_CANVAS_W, background: "rgba(59,130,246,0.7)" }} />
        )
      )}
    </div>
  );
}
```

- [ ] **Create floating-toolbar.tsx**

```tsx
"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { defaultElementFrame } from "@/lib/slide-graph/freeform";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  element: SlideElement
  elementIndex: number
  onUpdate: (patch: Partial<SlideElement>) => void
  onDelete: () => void
}

export function FloatingToolbar({ element, elementIndex, onUpdate, onDelete }: FloatingToolbarProps) {
  const frame = element.frame ?? defaultElementFrame(elementIndex, element.type);
  const isBold = element.style?.fontWeight === "bold";
  const isItalic = !!element.style?.italic;

  const btn = "w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y - 40,
        zIndex: 1002,
        pointerEvents: "all",
      }}
    >
      <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg px-1.5 py-1 shadow-lg">
        <button type="button" className={cn(btn, isBold ? active : inactive)} onClick={() => onUpdate({ style: { ...element.style, fontWeight: isBold ? "normal" : "bold" } })}>
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button type="button" className={cn(btn, isItalic ? active : inactive)} onClick={() => onUpdate({ style: { ...element.style, italic: !isItalic } })}>
          <Italic className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {(["left", "center", "right"] as const).map((align) => {
          const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
          return (
            <button key={align} type="button" className={cn(btn, element.style?.textAlign === align ? active : inactive)} onClick={() => onUpdate({ style: { ...element.style, textAlign: align } })}>
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
        <div className="w-px h-4 bg-border mx-0.5" />
        <button type="button" className={cn(btn, "text-destructive hover:bg-destructive/10")} onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/snap-guides.tsx components/playground/slides/floating-toolbar.tsx
git commit -m "feat: add SnapGuides and FloatingToolbar components"
```

---

## Task 11: ContextPanel + PositionSection

**Files:**
- Create: `components/playground/slides/panels/context-panel.tsx`
- Create: `components/playground/slides/panels/position-section.tsx`

- [ ] **Create position-section.tsx** (shared by all element panels)

```tsx
"use client";

import type { SlideElement, SlideElementFrame } from "@/lib/slide-graph/types";
import { clampFrame, defaultElementFrame } from "@/lib/slide-graph/freeform";

interface PositionSectionProps {
  element: SlideElement
  elementIndex: number
  onUpdate: (patch: Partial<SlideElement>) => void
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <input
        type="number"
        className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function PositionSection({ element, elementIndex, onUpdate }: PositionSectionProps) {
  const frame = element.frame ?? defaultElementFrame(elementIndex, element.type);

  const update = (patch: Partial<SlideElementFrame>) => {
    onUpdate({ frame: clampFrame({ ...frame, ...patch }) });
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Позиция и размер</p>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="X" value={frame.x} onChange={(x) => update({ x })} />
        <NumInput label="Y" value={frame.y} onChange={(y) => update({ y })} />
        <NumInput label="W" value={frame.w} onChange={(w) => update({ w })} />
        <NumInput label="H" value={frame.h} onChange={(h) => update({ h })} />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={!!element.locked}
            onChange={(e) => onUpdate({ locked: e.target.checked })}
            className="rounded"
          />
          🔒 Заблокировать
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={element.visible !== false}
            onChange={(e) => onUpdate({ visible: e.target.checked })}
            className="rounded"
          />
          👁 Видимый
        </label>
      </div>
      <div>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Имя слоя</span>
        <input
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-1"
          placeholder={element.type}
          value={element.name ?? ""}
          onChange={(e) => onUpdate({ name: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}
```

- [ ] **Create context-panel.tsx**

```tsx
"use client";

import { Layers, Square, Palette, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import type { SlideElement } from "@/lib/slide-graph/types";

// Lazy imports for property panels
import { TextPropertiesPanel } from "./text-properties";
import { ListPropertiesPanel } from "./list-properties";
import { ImagePropertiesPanel } from "./image-properties";
import { CardPropertiesPanel } from "./card-properties";
import { SlidePropertiesPanel } from "./slide-properties";
import { ThemeEditorPanel } from "./theme-editor";
import { NotesPanel } from "./notes-panel";
import { QualityScoreBadge } from "./quality-score-badge";

const TEXT_TYPES: SlideElement["type"][] = ["heading", "subheading", "body", "quote", "caption", "label"];
const CARD_TYPES: SlideElement["type"][] = ["metric-card", "feature-card", "step-card", "stat-number", "pricing-card", "timeline-col"];

export function ContextPanel({ projectId }: { projectId: string }) {
  const { rightMode, setRightMode, selectedElemId } = useEditorStore();
  const { graph, activeSlideIndex } = (() => {
    const g = useSlideStore((s) => s.graph);
    const i = useEditorStore((s) => s.activeSlideIndex);
    return { graph: g, activeSlideIndex: i };
  })();

  const slide = graph.slides[activeSlideIndex];
  const selectedEl = slide?.elements.find((e) => e.id === selectedElemId) ?? null;
  const selectedIndex = selectedEl ? (slide?.elements.indexOf(selectedEl) ?? 0) : 0;

  const updateElement = useSlideStore((s) => s.updateElement);
  const onUpdate = (patch: Partial<SlideElement>) => {
    if (!slide || !selectedEl) return;
    updateElement(slide.id, selectedEl.id, patch);
  };

  const modes = [
    { key: "props" as const, icon: Layers, label: "Свойства" },
    { key: "slide" as const, icon: Square, label: "Слайд" },
    { key: "theme" as const, icon: Palette, label: "Тема" },
    { key: "notes" as const, icon: FileText, label: "Заметки" },
  ];

  return (
    <div className="w-56 shrink-0 border-l border-border bg-card flex flex-col">
      {/* Mode icon bar */}
      <div className="flex border-b border-border shrink-0">
        {modes.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            title={label}
            onClick={() => setRightMode(key)}
            className={cn(
              "flex-1 flex items-center justify-center py-2.5 transition-colors",
              rightMode === key ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
      </div>

      {/* Panel body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {rightMode === "slide" && slide && (
          <SlidePropertiesPanel slide={slide} projectId={projectId} />
        )}
        {rightMode === "theme" && (
          <ThemeEditorPanel theme={graph.meta.theme} projectId={projectId} />
        )}
        {rightMode === "notes" && slide && (
          <NotesPanel slide={slide} projectId={projectId} />
        )}
        {rightMode === "props" && (
          <>
            {!selectedEl && slide && <SlidePropertiesPanel slide={slide} projectId={projectId} />}
            {selectedEl && TEXT_TYPES.includes(selectedEl.type) && (
              <TextPropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && selectedEl.type === "bullet-list" && (
              <ListPropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && selectedEl.type === "image" && (
              <ImagePropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && CARD_TYPES.includes(selectedEl.type) && (
              <CardPropertiesPanel element={selectedEl} elementIndex={selectedIndex} onUpdate={onUpdate} />
            )}
            {selectedEl && slide && (
              <QualityScoreBadge slide={slide} theme={graph.meta.theme} />
            )}
          </>
        )}
      </div>

      {/* AI button */}
      <button
        type="button"
        className="m-2 p-2.5 bg-primary/10 border border-primary/30 rounded-lg flex items-center gap-2 hover:bg-primary/20 transition-colors"
        onClick={() => {
          const bar = document.getElementById("ai-inline-bar-input");
          bar?.focus();
        }}
      >
        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[9px] font-black text-white shrink-0">AI</div>
        <span className="text-xs text-primary font-medium">Редактировать с AI</span>
        <kbd className="ml-auto text-[9px] text-muted-foreground bg-muted border border-border rounded px-1">/</kbd>
      </button>
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/panels/
git commit -m "feat: add ContextPanel router and PositionSection"
```

---

## Task 12: TextProperties + ListProperties + ImageProperties + CardProperties

**Files:**
- Create: `components/playground/slides/panels/text-properties.tsx`
- Create: `components/playground/slides/panels/list-properties.tsx`
- Create: `components/playground/slides/panels/image-properties.tsx`
- Create: `components/playground/slides/panels/card-properties.tsx`

- [ ] **Create text-properties.tsx**

```tsx
"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function TextPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  const isBold = element.style?.fontWeight === "bold";
  const isItalic = !!element.style?.italic;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Текст</p>
        <textarea
          className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          rows={4}
          value={element.content ?? ""}
          onChange={(e) => onUpdate({ content: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Стиль</p>
        <div className="flex gap-1.5">
          <button type="button" onClick={() => onUpdate({ style: { ...element.style, fontWeight: isBold ? "normal" : "bold" } })}
            className={cn("flex-1 h-8 rounded border flex items-center justify-center text-xs font-bold transition-colors",
              isBold ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button" onClick={() => onUpdate({ style: { ...element.style, italic: !isItalic } })}
            className={cn("flex-1 h-8 rounded border flex items-center justify-center transition-colors",
              isItalic ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
            <Italic className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <button key={align} type="button"
              onClick={() => onUpdate({ style: { ...element.style, textAlign: align } })}
              className={cn("flex-1 h-7 rounded border text-[10px] font-medium transition-colors",
                element.style?.textAlign === align ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted text-muted-foreground")}>
              {align === "left" ? "←" : align === "center" ? "↔" : "→"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Цвет текста</p>
        <div className="flex items-center gap-2">
          <input type="color" className="h-7 w-10 rounded border border-border cursor-pointer bg-transparent"
            value={element.style?.color ?? "#000000"}
            onChange={(e) => onUpdate({ style: { ...element.style, color: e.target.value } })} />
          <span className="text-xs text-muted-foreground font-mono">{element.style?.color ?? "—"}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Прозрачность</p>
        <input type="range" min={0} max={1} step={0.05} className="w-full h-1.5 accent-primary"
          value={element.style?.opacity ?? 1}
          onChange={(e) => onUpdate({ style: { ...element.style, opacity: parseFloat(e.target.value) } })} />
      </div>

      <div className="border-t border-border pt-3">
        <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
```

- [ ] **Create list-properties.tsx**

```tsx
"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function ListPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  const items = element.items ?? [];

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Пункты</p>
        {items.map((item, i) => (
          <div key={i} className="flex gap-1.5">
            <input className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onUpdate({ items: next });
              }} />
            <button type="button" className="text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => onUpdate({ items: items.filter((_, j) => j !== i) })}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <Button size="sm" variant="outline" className="h-7 text-xs w-full gap-1"
          onClick={() => onUpdate({ items: [...items, ""] })}>
          <Plus className="w-3 h-3" /> Добавить пункт
        </Button>
      </div>
      <div className="border-t border-border pt-3">
        <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
```

- [ ] **Create image-properties.tsx**

```tsx
"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function ImagePropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">URL изображения</p>
        <input className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="https://..."
          value={element.src ?? ""}
          onChange={(e) => onUpdate({ src: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Alt-текст</p>
        <input className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          value={element.alt ?? ""}
          onChange={(e) => onUpdate({ alt: e.target.value })} />
      </div>
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Прозрачность</p>
        <input type="range" min={0} max={1} step={0.05} className="w-full h-1.5 accent-primary"
          value={element.style?.opacity ?? 1}
          onChange={(e) => onUpdate({ style: { ...element.style, opacity: parseFloat(e.target.value) } })} />
      </div>
      <div className="border-t border-border pt-3">
        <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
```

- [ ] **Create card-properties.tsx**

```tsx
"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function CardPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  const inp = "w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary";
  const lbl = "text-[10px] font-semibold text-muted-foreground uppercase tracking-wide";

  return (
    <div className="space-y-4">
      <p className="text-xs font-medium capitalize">{element.type.replace(/-/g, " ")}</p>

      {["metric-card", "feature-card", "step-card"].includes(element.type) && (
        <>
          <div className="space-y-1.5"><p className={lbl}>Заголовок</p>
            <input className={inp} value={element.content ?? element.label ?? ""} onChange={(e) => onUpdate({ content: e.target.value })} />
          </div>
          <div className="space-y-1.5"><p className={lbl}>Описание</p>
            <textarea className={cn(inp, "resize-none")} rows={2} value={element.description ?? ""} onChange={(e) => onUpdate({ description: e.target.value })} />
          </div>
        </>
      )}

      {element.type === "stat-number" && (
        <>
          <div className="space-y-1.5"><p className={lbl}>Значение</p>
            <input className={inp} value={element.value ?? ""} onChange={(e) => onUpdate({ value: e.target.value })} />
          </div>
          <div className="space-y-1.5"><p className={lbl}>Метка</p>
            <input className={inp} value={element.label ?? ""} onChange={(e) => onUpdate({ label: e.target.value })} />
          </div>
          <div className="space-y-1.5"><p className={lbl}>Изменение (напр. +12%)</p>
            <input className={inp} value={element.change ?? ""} onChange={(e) => onUpdate({ change: e.target.value })} />
          </div>
        </>
      )}

      {element.type === "pricing-card" && (
        <>
          <div className="space-y-1.5"><p className={lbl}>Тариф</p>
            <input className={inp} value={element.planName ?? ""} onChange={(e) => onUpdate({ planName: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <div className="space-y-1.5 flex-1"><p className={lbl}>Цена</p>
              <input className={inp} value={element.price ?? ""} onChange={(e) => onUpdate({ price: e.target.value })} />
            </div>
            <div className="space-y-1.5 flex-1"><p className={lbl}>Период</p>
              <input className={inp} value={element.period ?? ""} onChange={(e) => onUpdate({ period: e.target.value })} />
            </div>
          </div>
        </>
      )}

      <div className="border-t border-border pt-3">
        <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/panels/text-properties.tsx components/playground/slides/panels/list-properties.tsx components/playground/slides/panels/image-properties.tsx components/playground/slides/panels/card-properties.tsx
git commit -m "feat: add element property panels (text, list, image, card)"
```

---

## Task 13: SlideProperties + ThemeEditor + NotesPanel + QualityScoreBadge

**Files:**
- Create: `components/playground/slides/panels/slide-properties.tsx`
- Create: `components/playground/slides/panels/theme-editor.tsx`
- Create: `components/playground/slides/panels/notes-panel.tsx`
- Create: `components/playground/slides/panels/quality-score-badge.tsx`

- [ ] **Create slide-properties.tsx**

```tsx
"use client";

import type { Slide } from "@/lib/slide-graph/types";
import { useSlideStore } from "@/lib/stores/use-slide-store";

export function SlidePropertiesPanel({ slide, projectId: _ }: { slide: Slide; projectId: string }) {
  const updateBackground = useSlideStore((s) => s.updateBackground);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Фон слайда</p>
      <div className="space-y-2">
        <div>
          <p className="text-[9px] text-muted-foreground mb-1">Цвет</p>
          <div className="flex items-center gap-2">
            <input type="color" className="h-7 w-10 rounded border border-border cursor-pointer bg-transparent"
              value={slide.background?.color ?? "#ffffff"}
              onChange={(e) => updateBackground(slide.id, { color: e.target.value })} />
            <button type="button" className="text-[10px] text-muted-foreground hover:text-foreground"
              onClick={() => updateBackground(slide.id, { color: undefined, gradient: undefined })}>
              Сбросить
            </button>
          </div>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground mb-1">Градиент (CSS)</p>
          <input className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="linear-gradient(135deg, #1e1b4b, #312e81)"
            value={slide.background?.gradient ?? ""}
            onChange={(e) => updateBackground(slide.id, { gradient: e.target.value || undefined })} />
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground mb-1">URL изображения</p>
          <input className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="https://..."
            value={slide.background?.image ?? ""}
            onChange={(e) => updateBackground(slide.id, { image: e.target.value || undefined })} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Create theme-editor.tsx**

```tsx
"use client";

import type { SlideTheme } from "@/lib/slide-graph/types";

interface Props { theme: SlideTheme; projectId: string }

export function ThemeEditorPanel({ theme, projectId: _ }: Props) {
  // Theme changes require a full graph update — wired in PresentationEditor via onThemeChange prop
  // For now, display read-only — full editing is a follow-up task
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Тема</p>
      <div className="space-y-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-border" style={{ background: theme.primaryColor }} />
          <span>Основной</span>
          <span className="ml-auto font-mono text-[10px]">{theme.primaryColor}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-border" style={{ background: theme.backgroundColor }} />
          <span>Фон</span>
          <span className="ml-auto font-mono text-[10px]">{theme.backgroundColor}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border border-border" style={{ background: theme.textColor }} />
          <span>Текст</span>
          <span className="ml-auto font-mono text-[10px]">{theme.textColor}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 pt-1">Редактирование темы через AI: «Измени тему на тёмную»</p>
      </div>
    </div>
  );
}
```

- [ ] **Create notes-panel.tsx**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import type { Slide } from "@/lib/slide-graph/types";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props { slide: Slide; projectId: string }

export function NotesPanel({ slide, projectId }: Props) {
  const [value, setValue] = useState(slide.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setValue(slide.notes ?? ""); }, [slide.id, slide.notes]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/slides/manage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "update-notes", slideId: slide.id, notes: value }),
      });
    } finally {
      setSaving(false);
    }
  }, [projectId, slide.id, value]);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Заметки спикера</p>
      <textarea
        className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        rows={8}
        placeholder="Добавьте заметки для этого слайда…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button size="sm" className="h-7 text-xs w-full" onClick={() => void save()}
        disabled={saving || value === (slide.notes ?? "")}>
        {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null} Сохранить
      </Button>
    </div>
  );
}
```

- [ ] **Create quality-score-badge.tsx**

```tsx
"use client";

import { useMemo } from "react";
import type { Slide, SlideTheme } from "@/lib/slide-graph/types";
import { scoreSlide } from "@/lib/slide-graph/quality-scorer";

const METRIC_LABELS: Record<string, string> = {
  hierarchy: "Иерархия",
  density: "Плотность",
  readability: "Читаемость",
  balance: "Баланс",
};

function bar(score: number) {
  const color = score >= 70 ? "#22c55e" : score >= 45 ? "#f59e0b" : "#ef4444";
  return { width: `${score}%`, background: color };
}

export function QualityScoreBadge({ slide, theme }: { slide: Slide; theme: SlideTheme }) {
  const scores = useMemo(() => scoreSlide(slide, theme), [slide, theme]);
  const color = scores.total >= 70 ? "#22c55e" : scores.total >= 45 ? "#f59e0b" : "#ef4444";

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Качество слайда</p>
      <div className="flex items-center gap-3 bg-muted/40 rounded-lg px-3 py-2">
        <span className="text-2xl font-black" style={{ color }}>{scores.total}</span>
        <div className="flex-1 space-y-1.5">
          {(["hierarchy", "density", "readability", "balance"] as const).map((k) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground w-16 shrink-0">{METRIC_LABELS[k]}</span>
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={bar(scores[k])} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/panels/slide-properties.tsx components/playground/slides/panels/theme-editor.tsx components/playground/slides/panels/notes-panel.tsx components/playground/slides/panels/quality-score-badge.tsx
git commit -m "feat: add slide/theme/notes panels and quality score badge"
```

---

## Task 14: LayersPanel + AiInlineBar

**Files:**
- Create: `components/playground/slides/layers-panel.tsx`
- Create: `components/playground/slides/ai-inline-bar.tsx`

- [ ] **Create layers-panel.tsx**

```tsx
"use client";

import type { Slide, SlideElement } from "@/lib/slide-graph/types";
import { Eye, EyeOff, Lock, Unlock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";

export function LayersPanel({ slide }: { slide: Slide }) {
  const selectedElemId = useEditorStore((s) => s.selectedElemId);
  const setSelectedElemId = useEditorStore((s) => s.setSelectedElemId);
  const updateElement = useSlideStore((s) => s.updateElement);

  const elements = [...slide.elements].reverse(); // top layer first

  return (
    <div className="flex flex-col gap-0.5 p-2">
      {elements.length === 0 && (
        <p className="text-[11px] text-muted-foreground text-center py-4">Нет элементов</p>
      )}
      {elements.map((el) => {
        const isSelected = el.id === selectedElemId;
        const isVisible = el.visible !== false;
        const isLocked = !!el.locked;
        const label = el.name ?? el.type.replace(/-/g, " ");

        return (
          <div
            key={el.id}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer text-xs transition-colors",
              isSelected ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
            )}
            onClick={() => setSelectedElemId(isSelected ? null : el.id)}
          >
            <GripVertical className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="flex-1 truncate capitalize">{label}</span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); updateElement(slide.id, el.id, { visible: !isVisible }); }}
            >
              {isVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.stopPropagation(); updateElement(slide.id, el.id, { locked: !isLocked }); }}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Create ai-inline-bar.tsx**

```tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import type { SlideGraph } from "@/lib/slide-graph/types";

interface Props { projectId: string }

export function AiInlineBar({ projectId }: Props) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setGraph = useSlideStore((s) => s.setGraph);
  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const graph = useSlideStore((s) => s.graph);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/slides/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: [] }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { data?: { graph?: SlideGraph } };
      if (data.data?.graph) setGraph(data.data.graph);
    } finally {
      setSending(false);
    }
  }, [input, sending, projectId, setGraph]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); }
    if (e.key === "Escape") setInput("");
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-border bg-card/80 backdrop-blur-sm">
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-[9px] font-black text-white shrink-0">AI</div>
      <input
        id="ai-inline-bar-input"
        ref={inputRef}
        className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground"
        placeholder="Спросите AI или нажмите / для команд…"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={sending}
      />
      {sending ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
      ) : (
        <button type="button" onClick={() => void send()} disabled={!input.trim()}
          className="text-primary disabled:text-muted-foreground transition-colors">
          <Send className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Commit**

```bash
git add components/playground/slides/layers-panel.tsx components/playground/slides/ai-inline-bar.tsx
git commit -m "feat: add LayersPanel and AiInlineBar"
```

---

## Task 15: Wire up PresentationEditor

**Files:**
- Modify: `app/(builder)/playground/presentations/presentation-editor.tsx`

- [ ] **Replace the editor body** — keep the existing `SlideThumbnail` component (it already uses iframe for thumbnails), replace only the main canvas and right panel sections.

Find the `SlideVisualEditor` export function (around line 478 in the old `slide-visual-editor.tsx`, or the main export in `presentation-editor.tsx`) and replace with:

```tsx
"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, ChevronLeft, ChevronRight, Plus, ChevronUp, ChevronDown, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAYGROUND_HOME_PROJECTS_HREF } from "@/lib/playground-project-edit-url";
import type { SlideGraph, Slide } from "@/lib/slide-graph/types";
import { renderSlide } from "@/lib/slide-graph/renderer";
import { buildSlideDeckStyles } from "@/lib/slide-graph/slide-deck-styles";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { SlideCanvas } from "@/components/playground/slides/slide-canvas";
import { InteractionLayer } from "@/components/playground/slides/interaction-layer";
import { SnapGuides } from "@/components/playground/slides/snap-guides";
import { FloatingToolbar } from "@/components/playground/slides/floating-toolbar";
import { ContextPanel } from "@/components/playground/slides/panels/context-panel";
import { LayersPanel } from "@/components/playground/slides/layers-panel";
import { AiInlineBar } from "@/components/playground/slides/ai-inline-bar";

// ─── Thumbnail (unchanged — uses iframe for isolation) ────────────────────────

function SlideThumbnail({ slide, theme, index, active, onClick, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, canDelete }: {
  slide: Slide; theme: SlideGraph["meta"]["theme"]; index: number; active: boolean;
  onClick: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
  canMoveUp: boolean; canMoveDown: boolean; canDelete: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = `<!DOCTYPE html><html><head><style>${buildSlideDeckStyles(theme, "embed")}</style></head><body>${renderSlide(slide, theme)}</body></html>`;
    doc.open(); doc.write(html); doc.close();
  }, [slide, theme]);

  return (
    <div className="group relative w-full shrink-0">
      <button type="button" onClick={onClick}
        className={cn("relative w-full rounded-md overflow-hidden border-2 transition-all", active ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30")}
        style={{ aspectRatio: "16/9" }}>
        <iframe ref={iframeRef} title={`Слайд ${index + 1}`}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "960px", height: "540px", transform: "scale(var(--thumb-scale,0.145))", transformOrigin: "top left" }}
          sandbox="allow-same-origin" />
        <span className="absolute bottom-1 right-1.5 text-[9px] text-white/60 bg-black/30 px-1 rounded">{index + 1}</span>
      </button>
      <div className={cn("absolute right-0.5 top-0.5 flex flex-col gap-0.5 transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <button type="button" disabled={!canMoveUp} onClick={onMoveUp} className="w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
        <button type="button" disabled={!canMoveDown} onClick={onMoveDown} className="w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
        {canDelete && <button type="button" onClick={onDelete} className="w-5 h-5 rounded bg-red-500/70 text-white flex items-center justify-center hover:bg-red-600/80"><X className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

interface PresentationEditorProps {
  projectId: string
  initialGraph: SlideGraph
  userPlan: string | null
}

export function PresentationEditor({ projectId, initialGraph, userPlan: _ }: PresentationEditorProps) {
  const { t } = useI18n();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Stores
  const init = useSlideStore((s) => s.init);
  const graph = useSlideStore((s) => s.graph);
  const deleteElement = useSlideStore((s) => s.deleteElement);
  const ensureFrames = useSlideStore((s) => s.ensureFrames);
  const updateElement = useSlideStore((s) => s.updateElement);

  const { activeSlideIndex, selectedElemId, leftTab, snapGuides, setActiveSlideIndex, setSelectedElemId, setLeftTab } = useEditorStore();

  // Initialise stores once
  useEffect(() => { init(projectId, initialGraph); }, [init, projectId, initialGraph]);

  const [exporting, setExporting] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);

  const slide = graph.slides[activeSlideIndex] ?? graph.slides[0];

  // Ensure all elements have frames when slide changes
  useEffect(() => {
    if (slide) ensureFrames(slide.id);
  }, [slide?.id, ensureFrames]);

  const selectedEl = slide?.elements.find((e) => e.id === selectedElemId) ?? null;
  const selectedIndex = selectedEl ? (slide?.elements.indexOf(selectedEl) ?? 0) : 0;

  const handleExport = useCallback(async (format: "pptx" | "pdf" = "pptx") => {
    setExporting(true);
    try {
      const endpoint = format === "pdf" ? `/api/projects/${projectId}/slides/export-pdf` : `/api/projects/${projectId}/slides/export`;
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${graph.meta.title}.${format}`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }, [projectId, graph.meta.title]);

  const callManage = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/projects/${projectId}/slides/manage`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const data = (await res.json()) as { data?: { graph?: SlideGraph }; graph?: SlideGraph };
    const newGraph = data.data?.graph ?? data.graph;
    if (newGraph) useSlideStore.getState().setGraph(newGraph);
    return newGraph;
  }, [projectId]);

  const handleDeleteSlide = useCallback(async (slideId: string) => {
    if (!window.confirm("Удалить этот слайд?")) return;
    const newGraph = await callManage({ op: "delete", slideId });
    if (newGraph) setActiveSlideIndex(Math.min(activeSlideIndex, newGraph.slides.length - 1));
  }, [callManage, activeSlideIndex, setActiveSlideIndex]);

  const handleMoveSlide = useCallback(async (index: number, dir: "up" | "down") => {
    const slides = [...graph.slides];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    [slides[index], slides[target]] = [slides[target]!, slides[index]!];
    await callManage({ op: "reorder", slideIds: slides.map((s) => s.id) });
    setActiveSlideIndex(target);
  }, [graph.slides, callManage, setActiveSlideIndex]);

  const handleAddSlide = useCallback(async () => {
    setAddingSlide(true);
    try {
      const newGraph = await callManage({ op: "add", afterSlideId: slide?.id });
      if (newGraph) {
        const newIdx = newGraph.slides.findIndex((s: Slide) => !graph.slides.some((old) => old.id === s.id));
        if (newIdx !== -1) setActiveSlideIndex(newIdx);
      }
    } finally { setAddingSlide(false); }
  }, [callManage, slide?.id, graph.slides, setActiveSlideIndex]);

  if (!slide) return null;

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Topbar */}
      <header className="flex items-center gap-2 px-4 h-11 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
          onClick={() => router.push(PLAYGROUND_HOME_PROJECTS_HREF)}>
          <ArrowLeft className="w-4 h-4" />{t("nav_projects")}
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <p className="text-sm font-medium truncate max-w-[280px]">{graph.meta.title}</p>
        <div className="flex-1" />
        <div className="flex items-center gap-1 border border-border rounded-md px-1">
          <button type="button" onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))} disabled={activeSlideIndex === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs font-medium min-w-[48px] text-center">{activeSlideIndex + 1} / {graph.slides.length}</span>
          <button type="button" onClick={() => setActiveSlideIndex(Math.min(graph.slides.length - 1, activeSlideIndex + 1))} disabled={activeSlideIndex === graph.slides.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PPTX
        </Button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel */}
        <div className="w-44 shrink-0 border-r border-border bg-muted/20 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border shrink-0">
            {(["slides", "layers"] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => setLeftTab(tab)}
                className={cn("flex-1 py-2 text-[11px] font-medium transition-colors border-b-2",
                  leftTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                {tab === "slides" ? "Слайды" : "Слои"}
              </button>
            ))}
          </div>

          {leftTab === "slides" && (
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
              {graph.slides.map((s, i) => (
                <SlideThumbnail key={s.id} slide={s} theme={graph.meta.theme} index={i}
                  active={i === activeSlideIndex}
                  onClick={() => { setActiveSlideIndex(i); setSelectedElemId(null); }}
                  onDelete={() => void handleDeleteSlide(s.id)}
                  onMoveUp={() => void handleMoveSlide(i, "up")}
                  onMoveDown={() => void handleMoveSlide(i, "down")}
                  canMoveUp={i > 0} canMoveDown={i < graph.slides.length - 1} canDelete={graph.slides.length > 1} />
              ))}
              <button type="button" onClick={() => void handleAddSlide()} disabled={addingSlide}
                className="w-full rounded-md border-2 border-dashed border-border/60 hover:border-primary/50 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary transition-colors">
                {addingSlide ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Слайд
              </button>
            </div>
          )}

          {leftTab === "layers" && <LayersPanel slide={slide} />}
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div ref={containerRef} className="flex-1 overflow-hidden bg-[#0a0f1a] flex items-center justify-center relative"
            onClick={(e) => { if (e.target === e.currentTarget) setSelectedElemId(null); }}>
            {/* Canvas + interaction overlays */}
            <div style={{ position: "relative" }}>
              <SlideCanvas
                slide={slide}
                theme={graph.meta.theme}
                containerRef={containerRef}
                onSelectElement={setSelectedElemId}
                onDeselectElement={() => setSelectedElemId(null)}
                selectedElemId={selectedElemId}
              />
              <InteractionLayer slide={slide} selectedElemId={selectedElemId} />
              <SnapGuides guides={snapGuides} />
              {selectedEl && (
                <FloatingToolbar
                  element={selectedEl}
                  elementIndex={selectedIndex}
                  onUpdate={(patch) => updateElement(slide.id, selectedEl.id, patch)}
                  onDelete={() => { deleteElement(slide.id, selectedEl.id); setSelectedElemId(null); }}
                />
              )}
            </div>
          </div>

          {/* AI bar */}
          <AiInlineBar projectId={projectId} />
        </div>

        {/* Right panel */}
        <ContextPanel projectId={projectId} />
      </div>
    </div>
  );
}
```

- [ ] **Type-check**

```bash
npx tsc --noEmit
```

- [ ] **Run tests to confirm nothing regressed**

```bash
npx vitest run
```

- [ ] **Commit**

```bash
git add app/\(builder\)/playground/presentations/presentation-editor.tsx
git commit -m "feat: wire up new React-canvas PresentationEditor with stores, layers, AI bar"
```

---

## Task 16: Verify in browser + cleanup

**Files:**
- Modify: `app/(builder)/playground/slides/page.tsx` (if it imports old editor)
- Delete: `components/playground/slides/slide-visual-editor.tsx` (after verification)

- [ ] **Start dev server**

```bash
npm run dev
```

- [ ] **Open the presentations editor**

Navigate to a project → Presentations → open a presentation. Verify:

1. Slides render in React canvas (no iframe for main canvas)
2. Click element → selection outline appears, FloatingToolbar visible
3. Drag element → moves with snap guides
4. Resize handles work (drag br handle)
5. Left panel tabs: Slides / Слои both work
6. Right panel: context changes when element selected
7. Quality score appears in right panel
8. AI bar at bottom sends request and updates graph

- [ ] **Check slide route imports old editor**

```bash
grep -r "slide-visual-editor" app/ components/ --include="*.tsx"
```

If any files import it, update them to import from the new location. The old file is in `components/playground/slides/slide-visual-editor.tsx`.

- [ ] **Delete old editor after verification**

```bash
git rm components/playground/slides/slide-visual-editor.tsx
```

- [ ] **Final type-check + tests**

```bash
npx tsc --noEmit && npx vitest run
```

Expected: no errors, all tests pass.

- [ ] **Final commit**

```bash
git add -A
git commit -m "feat: migrate to React canvas editor, remove iframe slide-visual-editor"
```

---

## Self-Review

**Spec coverage:**

| Requirement | Task |
|---|---|
| React canvas (CSS-scale 960×540) | Task 8 |
| Two Zustand stores | Tasks 5, 6 |
| Left panel tabs (Slides/Layers) | Task 15 (wiring) |
| Context-aware right panel | Tasks 11–13 |
| Drag to move + snap | Tasks 4, 9 |
| Resize handles (8) | Task 9 |
| SnapGuides visual | Task 10 |
| FloatingToolbar | Task 10 |
| Quality scorer | Task 3 |
| QualityScoreBadge | Task 13 |
| LayersPanel (lock/visible) | Task 14 |
| AI inline bar | Task 14 |
| Types extension | Task 1 |
| buildSlideDeckStyles react variant | Task 2 |
| Migrate from old editor | Task 16 |

**Placeholder check:** No TBD or TODO in code steps. ThemeEditorPanel is read-only (noted inline as intentional — full theme editing via AI is the designed path per spec).

**Type consistency:** `SlideElementFrame` from `freeform.ts` used throughout. `snapFrame()` returns `{ frame, guides }` — consistent with `SnapGuide[]` type in `useEditorStore`. `updateElement` signature `(slideId, elemId, patch)` consistent across Tasks 6, 9, 11, 15.

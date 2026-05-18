import type { Slide, SlideElement, SlideElementFrame, SlideElementType } from "./types";

export const SLIDE_CANVAS_W = 960;
export const SLIDE_CANVAS_H = 540;

const DEFAULT_SIZES: Partial<Record<SlideElementType, { w: number; h: number }>> = {
  heading: { w: 720, h: 72 },
  subheading: { w: 640, h: 48 },
  body: { w: 560, h: 120 },
  "bullet-list": { w: 520, h: 160 },
  image: { w: 320, h: 200 },
  quote: { w: 640, h: 100 },
  caption: { w: 400, h: 32 },
  label: { w: 200, h: 28 },
  "metric-card": { w: 220, h: 120 },
  "stat-number": { w: 180, h: 100 },
  "feature-card": { w: 200, h: 140 },
  "step-card": { w: 200, h: 130 },
  "pricing-card": { w: 240, h: 280 },
  "timeline-col": { w: 200, h: 200 },
};

export function isSlideFreeform(slide: Slide): boolean {
  if (slide.freeform) return true;
  return slide.elements.length > 0 && slide.elements.every((el) => Boolean(el.frame));
}

export function slideNeedsFrameCapture(slide: Slide): boolean {
  return slide.elements.some((el) => !el.frame);
}

export function defaultElementFrame(index: number, type: SlideElementType): SlideElementFrame {
  const size = DEFAULT_SIZES[type] ?? { w: 240, h: 80 };
  const col = index % 3;
  const row = Math.floor(index / 3);
  const gapX = 24;
  const gapY = 20;
  const x = 56 + col * (size.w + gapX);
  const y = 48 + row * (size.h + gapY);
  return {
    x: Math.min(x, SLIDE_CANVAS_W - size.w - 16),
    y: Math.min(y, SLIDE_CANVAS_H - size.h - 16),
    w: size.w,
    h: size.h,
    zIndex: index + 1,
  };
}

export function clampFrame(frame: SlideElementFrame): SlideElementFrame {
  const w = Math.max(24, Math.min(SLIDE_CANVAS_W, Math.round(frame.w)));
  const h = Math.max(24, Math.min(SLIDE_CANVAS_H, Math.round(frame.h)));
  const x = Math.max(0, Math.min(SLIDE_CANVAS_W - w, Math.round(frame.x)));
  const y = Math.max(0, Math.min(SLIDE_CANVAS_H - h, Math.round(frame.y)));
  return { ...frame, x, y, w, h };
}

export type FrameInitPayload = {
  elemId: string;
  frame: SlideElementFrame;
};

export function applyFramesToSlide(
  slide: Slide,
  frames: FrameInitPayload[],
  opts?: { freeform?: boolean }
): Slide {
  const byId = new Map(frames.map((f) => [f.elemId, clampFrame(f.frame)]));
  return {
    ...slide,
    freeform: opts?.freeform ?? true,
    elements: slide.elements.map((el, i) => {
      const frame = byId.get(el.id) ?? el.frame ?? defaultElementFrame(i, el.type);
      return { ...el, frame: clampFrame(frame) };
    }),
  };
}

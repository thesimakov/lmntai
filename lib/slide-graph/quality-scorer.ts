import type { Slide, SlideElement, SlideTheme } from "./types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, defaultElementFrame } from "./freeform";

export interface SlideQualityScore {
  density: number;
  hierarchy: number;
  balance: number;
  readability: number;
  total: number;
}

function parsePx(v: string | undefined): number {
  if (!v) return 0;
  return parseFloat(v) || 0;
}

function elementArea(el: SlideElement, idx: number): number {
  const f = el.frame ?? defaultElementFrame(idx, el.type);
  return f.w * f.h;
}

function scoreDensity(slide: Slide): number {
  if (slide.elements.length === 0) return 10;
  const totalArea = slide.elements.reduce((sum, el, i) => sum + elementArea(el, i), 0);
  const canvasArea = SLIDE_CANVAS_W * SLIDE_CANVAS_H;
  const ratio = totalArea / canvasArea;
  if (ratio < 0.05) return 10;
  if (ratio < 0.20) return 50 + ((ratio - 0.05) / 0.15) * 30;
  if (ratio <= 0.65) return 80 + (1 - Math.abs(ratio - 0.42) / 0.23) * 20;
  return Math.max(0, 80 - ((ratio - 0.65) / 0.35) * 80);
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
  let sumX = 0;
  let sumY = 0;
  let totalW = 0;
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

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

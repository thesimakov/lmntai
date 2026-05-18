import { describe, it, expect } from "vitest";
import { slideGraphSchema } from "./schema";

const minimalSlide = {
  id: "slide_1",
  layout: "title" as const,
  elements: [
    { id: "h1", type: "heading" as const, content: "Hello World" },
  ],
};

const minimalGraph = {
  version: 1 as const,
  meta: {
    title: "Test Deck",
    language: "en",
    theme: {
      primaryColor: "#4F8EF7",
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A2E",
      fontFamily: "Inter, sans-serif",
    },
    generatedAt: "2026-05-15T00:00:00.000Z",
  },
  slides: [minimalSlide],
};

describe("slideGraphSchema", () => {
  it("parses a valid graph", () => {
    const result = slideGraphSchema.safeParse(minimalGraph);
    expect(result.success).toBe(true);
  });

  it("rejects empty slides array", () => {
    const result = slideGraphSchema.safeParse({ ...minimalGraph, slides: [] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown layout", () => {
    const bad = {
      ...minimalGraph,
      slides: [{ ...minimalSlide, layout: "unknown-layout" }],
    };
    expect(slideGraphSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown element type", () => {
    const bad = {
      ...minimalGraph,
      slides: [{ ...minimalSlide, elements: [{ id: "e1", type: "video" }] }],
    };
    expect(slideGraphSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects missing version", () => {
    const { version, ...noVersion } = minimalGraph;
    expect(version).toBe(minimalGraph.version);
    expect(slideGraphSchema.safeParse(noVersion).success).toBe(false);
  });

  it("accepts bullet-list element with items", () => {
    const graph = {
      ...minimalGraph,
      slides: [
        {
          ...minimalSlide,
          elements: [
            { id: "b1", type: "bullet-list" as const, items: ["Item 1", "Item 2"] },
          ],
        },
      ],
    };
    expect(slideGraphSchema.safeParse(graph).success).toBe(true);
  });

  it("accepts slide with background", () => {
    const graph = {
      ...minimalGraph,
      slides: [
        {
          ...minimalSlide,
          background: { color: "#1a1a2e", overlay: 0.5 },
        },
      ],
    };
    expect(slideGraphSchema.safeParse(graph).success).toBe(true);
  });
});

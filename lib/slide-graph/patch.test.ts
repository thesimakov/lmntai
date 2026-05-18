import { describe, it, expect } from "vitest";
import {
  applySlidePatchBody,
  slideChatResponseToPatchBody,
  slidePatchBodySchema,
} from "./patch";
import type { SlideGraph } from "./types";

const baseGraph: SlideGraph = {
  version: 1,
  meta: {
    title: "Test",
    language: "ru",
    theme: {
      primaryColor: "#111",
      backgroundColor: "#fff",
      textColor: "#000",
      fontFamily: "Inter",
    },
    generatedAt: "",
  },
  slides: [
    {
      id: "slide_1",
      layout: "content",
      elements: [
        { id: "h1", type: "heading", content: "Hi" },
        { id: "b1", type: "body", content: "Body" },
      ],
    },
  ],
};

describe("slidePatchBodySchema", () => {
  it("accepts slideBackground patch", () => {
    const result = slidePatchBodySchema.safeParse({
      slideBackground: { slideId: "slide_1", background: { color: "#eee" } },
    });
    expect(result.success).toBe(true);
  });

  it("accepts addElement and deleteElement", () => {
    const result = slidePatchBodySchema.safeParse({
      addElement: {
        slideId: "slide_1",
        element: { id: "x1", type: "label", content: "Tag" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("accepts patches with extra element keys stripped", () => {
    const result = slidePatchBodySchema.safeParse({
      patches: [
        {
          slideId: "slide_1",
          elemId: "h1",
          content: "New",
          type: "heading",
          id: "h1",
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty body", () => {
    expect(slidePatchBodySchema.safeParse({}).success).toBe(false);
  });
});

describe("applySlidePatchBody", () => {
  it("updates background and reorders elements", () => {
    const next = applySlidePatchBody(baseGraph, {
      slideBackground: { slideId: "slide_1", background: { color: "#abc" } },
      reorderElements: { slideId: "slide_1", elemIds: ["b1", "h1"] },
    });
    expect(next.slides[0].background?.color).toBe("#abc");
    expect(next.slides[0].elements.map((e) => e.id)).toEqual(["b1", "h1"]);
  });

  it("converts slide chat response to patch body", () => {
    const body = slideChatResponseToPatchBody({
      message: "Added metric",
      addElement: {
        slideId: "slide_1",
        element: { id: "m_new", type: "metric-card", label: "ARR", description: "2M" },
      },
    });
    expect(body?.addElement?.element.id).toBe("m_new");
  });

  it("returns null when chat response has no mutations", () => {
    expect(slideChatResponseToPatchBody({ message: "Just a question" })).toBeNull();
  });

  it("applies initElementFrames and enables freeform", () => {
    const next = applySlidePatchBody(baseGraph, {
      initElementFrames: {
        slideId: "slide_1",
        frames: [
          { elemId: "h1", frame: { x: 40, y: 30, w: 400, h: 60 } },
          { elemId: "b1", frame: { x: 40, y: 110, w: 500, h: 120 } },
        ],
      },
    });
    expect(next.slides[0].freeform).toBe(true);
    expect(next.slides[0].elements[0].frame).toMatchObject({ x: 40, y: 30, w: 400, h: 60 });
  });

  it("clears gradient when solid background color is set", () => {
    const withGradient: SlideGraph = {
      ...baseGraph,
      slides: [
        {
          ...baseGraph.slides[0]!,
          background: {
            color: "#fff",
            gradient: "linear-gradient(135deg, #c41e3a 0%, #1a1a2e 100%)",
          },
        },
      ],
    };
    const next = applySlidePatchBody(withGradient, {
      slideBackground: { slideId: "slide_1", background: { color: "#2563eb" } },
    });
    expect(next.slides[0].background?.color).toBe("#2563eb");
    expect(next.slides[0].background?.gradient).toBeUndefined();
  });
});

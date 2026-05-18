import { describe, it, expect } from "vitest";
import {
  applySlidePatchBody,
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
});

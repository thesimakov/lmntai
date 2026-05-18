import { describe, it, expect } from "vitest";
import { renderSingleSlide, renderSlideGraph, renderSlide } from "./renderer";
import type { SlideGraph, Slide } from "./types";

const baseGraph: SlideGraph = {
  version: 1,
  meta: {
    title: "Test Deck",
    language: "en",
    theme: {
      primaryColor: "#4F8EF7",
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A2E",
      fontFamily: "Inter, sans-serif",
    },
    generatedAt: "2026-05-15T00:00:00Z",
  },
  slides: [
    {
      id: "slide_1",
      layout: "title",
      elements: [
        { id: "h1", type: "heading", content: "Welcome to Lemnity" },
        { id: "sub1", type: "subheading", content: "The AI website builder" },
      ],
    },
    {
      id: "slide_2",
      layout: "content",
      elements: [
        { id: "h2", type: "heading", content: "Features" },
        { id: "b1", type: "bullet-list", items: ["Fast AI", "Visual editor", "Export to PPTX"] },
      ],
    },
  ],
};

describe("renderSlideGraph", () => {
  it("returns a complete HTML document", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
  });

  it("includes slide content", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain("Welcome to Lemnity");
    expect(html).toContain("The AI website builder");
    expect(html).toContain("Fast AI");
  });

  it("includes slide deck title in <title>", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain("<title>Test Deck</title>");
  });

  it("wraps each slide with data-lmnt-slide-id", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain('data-lmnt-slide-id="slide_1"');
    expect(html).toContain('data-lmnt-slide-id="slide_2"');
  });

  it("injects data-lmnt-elem-id on elements", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain('data-lmnt-elem-id="h1"');
    expect(html).toContain('data-lmnt-elem-id="b1"');
  });

  it("includes postMessage click script", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain("postMessage");
    expect(html).toContain("lmnt-elem-selected");
  });

  it("includes font-family from theme", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain("Inter");
  });

  it("includes pre-wrap styles for multiline text", () => {
    const html = renderSlideGraph(baseGraph);
    expect(html).toContain("white-space: pre-wrap");
  });

  it("editor preview includes pre-wrap styles", () => {
    const graph: SlideGraph = {
      ...baseGraph,
      slides: [
        {
          id: "slide_1",
          layout: "content",
          elements: [{ id: "b1", type: "body", content: "A\nB" }],
        },
      ],
    };
    const html = renderSingleSlide(graph, 0, { editor: true });
    expect(html).toContain("white-space: pre-wrap");
    expect(html).toContain("A\nB");
  });
});

describe("renderSlide", () => {
  it("renders bullet-list items as <li>", () => {
    const slide: Slide = {
      id: "s1",
      layout: "content",
      elements: [
        { id: "bl1", type: "bullet-list", items: ["Alpha", "Beta", "Gamma"] },
      ],
    };
    const html = renderSlide(slide, { primaryColor: "#4F8EF7", backgroundColor: "#FFF", textColor: "#000", fontFamily: "Inter" });
    expect(html).toContain("<li");
    expect(html).toContain("Alpha");
    expect(html).toContain("Beta");
  });

  it("renders image element with alt", () => {
    const slide: Slide = {
      id: "s2",
      layout: "image-left",
      elements: [
        { id: "img1", type: "image", src: "https://picsum.photos/800/600", alt: "A photo" },
      ],
    };
    const html = renderSlide(slide, { primaryColor: "#4F8EF7", backgroundColor: "#FFF", textColor: "#000", fontFamily: "Inter" });
    expect(html).toContain("<img");
    expect(html).toContain('alt="A photo"');
  });

  it("renders quote element", () => {
    const slide: Slide = {
      id: "s3",
      layout: "quote",
      elements: [
        { id: "q1", type: "quote", content: "Innovation distinguishes leaders." },
      ],
    };
    const html = renderSlide(slide, { primaryColor: "#4F8EF7", backgroundColor: "#FFF", textColor: "#000", fontFamily: "Inter" });
    expect(html).toContain("Innovation distinguishes");
    expect(html).toContain("blockquote");
  });

  it("embeds newline characters in text content", () => {
    const slide: Slide = {
      id: "s5",
      layout: "content",
      elements: [{ id: "b1", type: "body", content: "Первая строка\nВторая строка" }],
    };
    const html = renderSlide(slide, {
      primaryColor: "#4F8EF7",
      backgroundColor: "#FFF",
      textColor: "#000",
      fontFamily: "Inter",
    });
    expect(html).toContain("Первая строка\nВторая строка");
  });

  it("applies slide background color", () => {
    const slide: Slide = {
      id: "s4",
      layout: "title",
      background: { color: "#1a1a2e" },
      elements: [{ id: "h1", type: "heading", content: "Dark slide" }],
    };
    const html = renderSlide(slide, { primaryColor: "#4F8EF7", backgroundColor: "#FFF", textColor: "#000", fontFamily: "Inter" });
    expect(html).toContain("#1a1a2e");
  });
});

import { describe, it, expect } from "vitest";
import { renderComponentGraph, renderNode } from "./renderer";
import type { ComponentGraph, ComponentNode } from "./types";

const baseGraph: ComponentGraph = {
  version: 1,
  meta: {
    projectName: "Test Site",
    language: "en",
    theme: {
      primaryColor: "#4F8EF7",
      backgroundColor: "#FFFFFF",
      textColor: "#1A1A2E",
      fontFamily: "Inter, sans-serif",
      borderRadius: "8px",
      maxWidth: "1200px",
    },
    generatedAt: "2026-05-15T00:00:00Z",
  },
  pages: [
    {
      id: "page_1",
      slug: "index",
      title: "Home",
      nodes: [
        {
          id: "hero_1",
          type: "Hero",
          props: { title: "Hello World", subtitle: "Welcome", ctaText: "Get Started", ctaHref: "#" },
          styles: {},
        },
      ],
    },
  ],
};

describe("renderComponentGraph", () => {
  it("returns a complete HTML document string", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<html");
    expect(html).toContain("</html>");
    expect(html).toContain("Hello World");
    expect(html).toContain("Get Started");
  });

  it("includes theme font-family in style", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("Inter");
  });

  it("includes page title", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("<title>Home</title>");
  });
});

describe("renderComponentGraph — multi-page", () => {
  const multiPageGraph: ComponentGraph = {
    ...baseGraph,
    pages: [
      {
        id: "page_1",
        slug: "index",
        title: "Home",
        nodes: [{ id: "hero_1", type: "Hero", props: { title: "Home Hero" }, styles: {} }],
      },
      {
        id: "page_2",
        slug: "pricing",
        title: "Pricing",
        nodes: [{ id: "hero_2", type: "Hero", props: { title: "Pricing Hero" } , styles: {} }],
      },
    ],
  };

  it("renders all pages", () => {
    const html = renderComponentGraph(multiPageGraph);
    expect(html).toContain("Home Hero");
    expect(html).toContain("Pricing Hero");
  });

  it("wraps pages in divs with correct ids", () => {
    const html = renderComponentGraph(multiPageGraph);
    expect(html).toContain('id="lmnt-page-index"');
    expect(html).toContain('id="lmnt-page-pricing"');
  });

  it("first page visible, second hidden", () => {
    const html = renderComponentGraph(multiPageGraph);
    expect(html).toContain('id="lmnt-page-index" class="lmnt-page">');
    expect(html).toContain('id="lmnt-page-pricing" class="lmnt-page" style="display:none"');
  });

  it("includes multi-page nav script", () => {
    const html = renderComponentGraph(multiPageGraph);
    expect(html).toContain("lmnt-page-");
    expect(html).toContain("hashchange");
  });

  it("single-page graph has no wrapper divs", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).not.toContain('class="lmnt-page"');
    expect(html).not.toContain("hashchange");
  });
});

describe("renderNode", () => {
  it("renders Heading node with correct tag", () => {
    const node: ComponentNode = {
      id: "h1",
      type: "Heading",
      props: { level: 2, content: "Section Title" },
      styles: {},
    };
    const html = renderNode(node);
    expect(html).toContain("<h2");
    expect(html).toContain("Section Title");
    expect(html).toContain("</h2>");
  });

  it("renders Text node as paragraph", () => {
    const node: ComponentNode = {
      id: "t1",
      type: "Text",
      props: { content: "Body text here" },
      styles: {},
    };
    expect(renderNode(node)).toContain("<p");
    expect(renderNode(node)).toContain("Body text here");
  });

  it("renders Button node as anchor", () => {
    const node: ComponentNode = {
      id: "btn1",
      type: "Button",
      props: { text: "Click me", href: "/about", variant: "primary" },
      styles: {},
    };
    const html = renderNode(node);
    expect(html).toContain("<a ");
    expect(html).toContain('href="/about"');
    expect(html).toContain("Click me");
  });

  it("renders Image node with alt", () => {
    const node: ComponentNode = {
      id: "img1",
      type: "Image",
      props: { src: "https://example.com/img.jpg", alt: "A photo" },
      styles: {},
    };
    const html = renderNode(node);
    expect(html).toContain("<img");
    expect(html).toContain('alt="A photo"');
  });

  it("renders children recursively", () => {
    const node: ComponentNode = {
      id: "sec1",
      type: "Section",
      props: {},
      styles: {},
      children: [{ id: "t1", type: "Text", props: { content: "Nested text" }, styles: {} }],
    };
    expect(renderNode(node)).toContain("Nested text");
  });

  it("applies styles as inline CSS", () => {
    const node: ComponentNode = {
      id: "s1",
      type: "Section",
      props: {},
      styles: { backgroundColor: "#FF0000", padding: "40px" },
    };
    const html = renderNode(node);
    expect(html).toContain("background-color:#FF0000");
    expect(html).toContain("padding:40px");
  });
});

describe("renderComponentGraph — Google Fonts + CSS vars", () => {
  it("injects google fonts link for Inter", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("fonts.googleapis.com");
    expect(html).toContain(`rel="preconnect"`);
  });

  it("skips font link for unknown font family", () => {
    const g = { ...baseGraph, meta: { ...baseGraph.meta, theme: { ...baseGraph.meta.theme, fontFamily: "Arial, sans-serif" } } };
    expect(renderComponentGraph(g)).not.toContain("fonts.googleapis.com");
  });

  it("emits :root CSS custom properties", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("--c-primary:");
    expect(html).toContain("--c-bg:");
    expect(html).toContain("--c-text:");
    expect(html).toContain("--radius:");
  });

  it("uses var(--c-primary) in baseStyles instead of literal color", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("var(--c-primary)");
  });

  it("includes scroll-behavior smooth", () => {
    const html = renderComponentGraph(baseGraph);
    expect(html).toContain("scroll-behavior:smooth");
  });
});

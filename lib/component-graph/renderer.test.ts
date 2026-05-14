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

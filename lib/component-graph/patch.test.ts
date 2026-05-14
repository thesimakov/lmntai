import { describe, it, expect } from "vitest";
import { applyPatches, graphPatchResponseSchema } from "./patch";
import type { ComponentGraph } from "./types";

const graph: ComponentGraph = {
  version: 1,
  meta: {
    projectName: "Test",
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
          id: "header_1",
          type: "Header",
          props: { logo: "MySite", links: [] },
          styles: {},
        },
        {
          id: "hero_1",
          type: "Hero",
          props: { title: "Old Title", subtitle: "Old Sub", ctaText: "Click" },
          styles: { backgroundColor: "#fff" },
          children: [
            { id: "hero_btn", type: "Button", props: { text: "CTA" }, styles: {} },
          ],
        },
      ],
    },
  ],
};

describe("applyPatches", () => {
  it("patches props on a top-level node", () => {
    const result = applyPatches(graph, [{ nodeId: "hero_1", props: { title: "New Title" } }]);
    const hero = result.pages[0].nodes[1];
    expect(hero.props.title).toBe("New Title");
    expect(hero.props.subtitle).toBe("Old Sub");
  });

  it("patches styles on a top-level node", () => {
    const result = applyPatches(graph, [{ nodeId: "hero_1", styles: { backgroundColor: "#000" } }]);
    const hero = result.pages[0].nodes[1];
    expect(hero.styles.backgroundColor).toBe("#000");
  });

  it("patches a nested child node", () => {
    const result = applyPatches(graph, [{ nodeId: "hero_btn", props: { text: "New CTA" } }]);
    const btn = result.pages[0].nodes[1].children![0];
    expect(btn.props.text).toBe("New CTA");
  });

  it("applies multiple patches", () => {
    const result = applyPatches(graph, [
      { nodeId: "hero_1", props: { title: "T2" } },
      { nodeId: "header_1", props: { logo: "NewLogo" } },
    ]);
    expect(result.pages[0].nodes[1].props.title).toBe("T2");
    expect(result.pages[0].nodes[0].props.logo).toBe("NewLogo");
  });

  it("ignores unknown nodeId silently", () => {
    const result = applyPatches(graph, [{ nodeId: "nonexistent", props: { x: 1 } }]);
    expect(result).toEqual(graph);
  });

  it("does not mutate original graph", () => {
    const original = JSON.stringify(graph);
    applyPatches(graph, [{ nodeId: "hero_1", props: { title: "X" } }]);
    expect(JSON.stringify(graph)).toBe(original);
  });
});

describe("graphPatchResponseSchema", () => {
  it("parses valid response", () => {
    const r = graphPatchResponseSchema.safeParse({
      message: "Updated hero title",
      patches: [{ nodeId: "hero_1", props: { title: "New" } }],
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty patches", () => {
    const r = graphPatchResponseSchema.safeParse({ message: "ok", patches: [] });
    expect(r.success).toBe(false);
  });

  it("rejects missing message", () => {
    const r = graphPatchResponseSchema.safeParse({ patches: [{ nodeId: "x" }] });
    expect(r.success).toBe(false);
  });
});

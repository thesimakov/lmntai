import { describe, it, expect } from "vitest";
import { applyPatches, graphNodePatchSchema, graphPatchResponseSchema } from "./patch";
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

const graphWithIds: ComponentGraph = {
  version: 1,
  meta: { projectName: "Test", language: "ru", theme: { primaryColor: "#000", backgroundColor: "#fff", textColor: "#111", fontFamily: "Inter", borderRadius: "8px", maxWidth: "1200px" }, generatedAt: "" },
  pages: [{ id: "p1", slug: "index", title: "Home", nodes: [
    { id: "header_1", type: "Header", props: {}, styles: {} },
    { id: "hero_1", type: "Hero", props: { title: "Hi" }, styles: {} },
    { id: "footer_1", type: "Footer", props: {}, styles: {} },
  ]}],
};

describe("applyPatches — add action", () => {
  it("appends new node to page by default", () => {
    const result = applyPatches(graphWithIds, [{
      nodeId: "new_cta", action: "add",
      node: { id: "new_cta", type: "CTA", props: { title: "Join" }, styles: {} },
    }]);
    expect(result.pages[0].nodes.map(n => n.id)).toContain("new_cta");
  });

  it("inserts after specified nodeId", () => {
    const result = applyPatches(graphWithIds, [{
      nodeId: "stats_1", action: "add",
      node: { id: "stats_1", type: "Stats", props: {}, styles: {} },
      insertAfter: "hero_1",
    }]);
    const nodes = result.pages[0].nodes;
    const heroIdx = nodes.findIndex(n => n.id === "hero_1");
    const statsIdx = nodes.findIndex(n => n.id === "stats_1");
    expect(statsIdx).toBe(heroIdx + 1);
  });
});

describe("applyPatches — remove action", () => {
  it("removes a top-level node", () => {
    const result = applyPatches(graphWithIds, [{ nodeId: "hero_1", action: "remove" }]);
    expect(result.pages[0].nodes.find(n => n.id === "hero_1")).toBeUndefined();
    expect(result.pages[0].nodes).toHaveLength(2);
  });

  it("preserves other nodes when removing", () => {
    const result = applyPatches(graphWithIds, [{ nodeId: "hero_1", action: "remove" }]);
    expect(result.pages[0].nodes.map(n => n.id)).toContain("header_1");
    expect(result.pages[0].nodes.map(n => n.id)).toContain("footer_1");
  });
});

describe("graphNodePatchSchema — action field", () => {
  it("defaults action to update when omitted", () => {
    const r = graphNodePatchSchema.safeParse({ nodeId: "x", props: { foo: 1 } });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.action).toBe("update");
  });

  it("accepts action:add with node", () => {
    const r = graphNodePatchSchema.safeParse({
      nodeId: "n1", action: "add",
      node: { id: "n1", type: "CTA", props: {}, styles: {} },
    });
    expect(r.success).toBe(true);
  });

  it("accepts action:remove", () => {
    const r = graphNodePatchSchema.safeParse({ nodeId: "hero_1", action: "remove" });
    expect(r.success).toBe(true);
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

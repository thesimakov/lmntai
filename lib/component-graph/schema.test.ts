import { describe, it, expect } from "vitest";
import { componentGraphSchema } from "./schema";

const minimalGraph = {
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
    generatedAt: "2026-05-15T00:00:00.000Z",
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
          props: { title: "Welcome" },
          styles: {},
        },
      ],
    },
  ],
};

describe("componentGraphSchema", () => {
  it("parses a valid graph", () => {
    const result = componentGraphSchema.safeParse(minimalGraph);
    expect(result.success).toBe(true);
  });

  it("rejects missing pages", () => {
    const result = componentGraphSchema.safeParse({ ...minimalGraph, pages: [] });
    expect(result.success).toBe(false);
  });

  it("rejects unknown node type", () => {
    const badGraph = {
      ...minimalGraph,
      pages: [
        {
          ...minimalGraph.pages[0],
          nodes: [{ id: "x", type: "UnknownWidget", props: {}, styles: {} }],
        },
      ],
    };
    const result = componentGraphSchema.safeParse(badGraph);
    expect(result.success).toBe(false);
  });

  it("rejects missing version", () => {
    const { version, ...noVersion } = minimalGraph;
    expect(version).toBe(minimalGraph.version);
    const result = componentGraphSchema.safeParse(noVersion);
    expect(result.success).toBe(false);
  });

  it("accepts Stats, Logos, Team, Timeline node types", () => {
    for (const type of ["Stats", "Logos", "Team", "Timeline"]) {
      const g = { ...minimalGraph, pages: [{ ...minimalGraph.pages[0],
        nodes: [{ id: "n1", type, props: {}, styles: {} }] }] };
      expect(componentGraphSchema.safeParse(g).success).toBe(true);
    }
  });
});

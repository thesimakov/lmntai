import { describe, it, expect } from "vitest";
import {
  normalizeComponentGraphPayload,
  parseComponentGraphFromAiText,
} from "./normalize";

describe("normalizeComponentGraphPayload", () => {
  it("coerces lowercase node types and missing styles", () => {
    const raw = {
      version: 1,
      meta: {
        projectName: "Site",
        language: "ru-RU",
        theme: {
          primaryColor: "blue",
          backgroundColor: "#fff",
          textColor: "#111",
        },
      },
      pages: [
        {
          slug: "index",
          title: "Home",
          nodes: [
            {
              id: "h1",
              type: "hero",
              props: { title: "Hi" },
            },
          ],
        },
      ],
    };
    const normalized = normalizeComponentGraphPayload(raw);
    const result = parseComponentGraphFromAiText(JSON.stringify(normalized));
    expect(result?.success).toBe(true);
    if (result?.success) {
      expect(result.data.pages[0].nodes[0].type).toBe("Hero");
      expect(result.data.meta.language).toBe("ru-RU");
    }
  });

  it("strips unknown style keys via schema strip", () => {
    const raw = {
      version: 1,
      meta: {
        projectName: "Site",
        language: "en",
        theme: {
          primaryColor: "#4F8EF7",
          backgroundColor: "#FFFFFF",
          textColor: "#1A1A2E",
          fontFamily: "Inter",
          borderRadius: "8px",
          maxWidth: "1200px",
        },
        generatedAt: "2026-05-15T00:00:00.000Z",
      },
      pages: [
        {
          id: "p1",
          slug: "index",
          title: "Home",
          nodes: [
            {
              id: "n1",
              type: "Section",
              props: {},
              styles: {
                fontWeight: "600",
                display: "inline-flex",
                unknownKey: "drop",
              },
            },
          ],
        },
      ],
    };
    const result = parseComponentGraphFromAiText(JSON.stringify(raw));
    expect(result?.success).toBe(true);
    if (result?.success) {
      const styles = result.data.pages[0].nodes[0].styles;
      expect(styles.fontWeight).toBe("semibold");
      expect(styles.display).toBe("flex");
      expect("unknownKey" in styles).toBe(false);
    }
  });

  it("parses fenced JSON from model output", () => {
    const fenced = `\`\`\`json
{
  "version": 1,
  "meta": {
    "projectName": "X",
    "language": "ru",
    "theme": {
      "primaryColor": "#4F8EF7",
      "backgroundColor": "#FFFFFF",
      "textColor": "#1A1A2E",
      "fontFamily": "Inter",
      "borderRadius": "8px",
      "maxWidth": "1200px"
    }
  },
  "pages": [{
    "slug": "index",
    "title": "Home",
    "nodes": [{ "id": "a", "type": "Hero", "props": {}, "styles": {} }]
  }]
}
\`\`\``;
    const result = parseComponentGraphFromAiText(fenced);
    expect(result?.success).toBe(true);
  });
});

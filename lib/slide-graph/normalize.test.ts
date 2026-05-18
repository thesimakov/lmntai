import { describe, it, expect } from "vitest";
import { getTemplate } from "./templates";
import {
  extractJsonFromAiText,
  normalizeSlideGraphPayload,
  parseSlideGraphFromAiText,
  repairTruncatedJson,
  unwrapSlideGraphRoot,
} from "./normalize";
import { slideGraphSchema } from "./schema";

describe("normalizeSlideGraphPayload", () => {
  it("coerces version string and long language names", () => {
    const raw = {
      version: "1",
      meta: {
        title: "Deck",
        language: "Russian",
        theme: {
          primaryColor: "#C41E3A",
          backgroundColor: "#FFF",
          textColor: "#111",
          fontFamily: "Inter",
        },
      },
      slides: [
        {
          id: "slide_1",
          layout: "title",
          elements: [{ id: "h1", type: "heading", content: "Hi" }],
        },
      ],
    };
    const normalized = normalizeSlideGraphPayload(raw);
    const parsed = slideGraphSchema.safeParse(normalized);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.version).toBe(1);
      expect(parsed.data.meta.language).toBe("ru");
    }
  });

  it("maps metric_card type and metrics_cards layout", () => {
    const raw = {
      version: 1,
      meta: {
        title: "T",
        language: "en",
        theme: {
          primaryColor: "#000",
          backgroundColor: "#fff",
          textColor: "#111",
          fontFamily: "Inter",
        },
        generatedAt: "",
      },
      slides: [
        {
          id: "s1",
          layout: "metrics_cards",
          elements: [{ id: "m1", type: "metric_card", label: "KPI", description: "x" }],
        },
      ],
    };
    const parsed = slideGraphSchema.safeParse(normalizeSlideGraphPayload(raw));
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.slides[0].layout).toBe("metrics-cards");
      expect(parsed.data.slides[0].elements[0].type).toBe("metric-card");
    }
  });

  it("aligns slide count and layouts to template", () => {
    const template = getTemplate("product-demo");
    expect(template).toBeDefined();
    const raw = {
      version: 1,
      meta: {
        title: "Product",
        language: "english",
        theme: { primaryColor: "red", backgroundColor: "white", textColor: "black" },
        generatedAt: "",
      },
      slides: [
        {
          id: "slide_1",
          layout: "content",
          elements: [{ id: "h", type: "heading", content: "Wrong layout" }],
        },
      ],
    };
    const parsed = slideGraphSchema.safeParse(
      normalizeSlideGraphPayload(raw, { template })
    );
    expect(parsed.success).toBe(true);
    if (parsed.success && template) {
      expect(parsed.data.slides).toHaveLength(template.slideCount);
      expect(parsed.data.slides[0].layout).toBe("title");
    }
  });
});

describe("parseSlideGraphFromAiText", () => {
  it("extracts JSON from markdown fence", () => {
    const text = '```json\n{"version":1,"meta":{"title":"A","language":"ru","theme":{"primaryColor":"#111","backgroundColor":"#fff","textColor":"#000","fontFamily":"Inter"},"generatedAt":""},"slides":[{"id":"s1","layout":"title","elements":[{"id":"e1","type":"heading","content":"Hi"}]}]}\n```';
    const result = parseSlideGraphFromAiText(text);
    expect(result?.success).toBe(true);
  });

  it("unwraps nested slideGraph key", () => {
    const inner = {
      version: 1,
      meta: {
        title: "Nested",
        language: "en",
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
          id: "s1",
          layout: "title",
          elements: [{ id: "e1", type: "heading", content: "Hi" }],
        },
      ],
    };
    const result = parseSlideGraphFromAiText(
      JSON.stringify({ slideGraph: inner })
    );
    expect(result?.success).toBe(true);
  });
});

describe("repairTruncatedJson", () => {
  it("closes unclosed braces and strings", () => {
    const broken =
      '{"version":1,"slides":[{"id":"s1","layout":"title","elements":[{"id":"e1","type":"heading","content":"Hi"';
    const repaired = repairTruncatedJson(broken);
    expect(() => JSON.parse(repaired)).not.toThrow();
  });

  it("closes a truncated root object", () => {
    const repaired = repairTruncatedJson('{"version":1,"slides":[]');
    expect(JSON.parse(repaired)).toEqual({ version: 1, slides: [] });
  });
});

describe("unwrapSlideGraphRoot", () => {
  it("returns root when slides at top level", () => {
    const root = { slides: [] };
    expect(unwrapSlideGraphRoot(root)).toBe(root);
  });
});

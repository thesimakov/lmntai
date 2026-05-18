import { describe, it, expect } from "vitest";
import { buildSlideGraphPptx } from "./pptx-export";
import type { SlideGraph } from "./types";

const baseTheme = {
  primaryColor: "#C41E3A",
  accentColor: "#FF6B8A",
  backgroundColor: "#FFFFFF",
  textColor: "#1A1A2E",
  fontFamily: "Inter, sans-serif",
};

describe("buildSlideGraphPptx", () => {
  it("returns a non-empty buffer for template metric slides", async () => {
    const graph: SlideGraph = {
      version: 1,
      meta: {
        title: "Export test",
        language: "ru",
        theme: baseTheme,
        generatedAt: "2026-05-18T00:00:00Z",
      },
      slides: [
        {
          id: "slide_1",
          layout: "metrics-cards",
          elements: [
            { id: "h1", type: "heading", content: "Проблема рынка" },
            { id: "m1", type: "metric-card", label: "CAC рост", description: "Стоимость привлечения +40%" },
            { id: "m2", type: "metric-card", label: "Churn", description: "Отток клиентов" },
            { id: "s1", type: "stat-number", value: "2.4M", change: "+18%", label: "ARR" },
          ],
        },
      ],
    };

    const buffer = await buildSlideGraphPptx(graph);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");
  });

  it("exports freeform slides with frames", async () => {
    const graph: SlideGraph = {
      version: 1,
      meta: {
        title: "Freeform",
        language: "ru",
        theme: baseTheme,
        generatedAt: "2026-05-18T00:00:00Z",
      },
      slides: [
        {
          id: "slide_1",
          layout: "content",
          freeform: true,
          elements: [
            {
              id: "b1",
              type: "body",
              content: "Строка 1\nСтрока 2",
              frame: { x: 80, y: 100, w: 400, h: 120 },
            },
            {
              id: "f1",
              type: "feature-card",
              badge: "AI",
              content: "Фича",
              description: "Описание",
              frame: { x: 520, y: 100, w: 200, h: 140 },
            },
          ],
        },
      ],
    };

    const buffer = await buildSlideGraphPptx(graph);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});

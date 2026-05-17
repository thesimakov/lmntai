import { describe, it, expect } from "vitest";
import { buildAnalysisPptx } from "./analytics-pptx-export";
import type { AnalysisDashboard } from "./analytics-schema";
import { sanitizePptxBrandAssets, sanitizePptxHex } from "./pptx-sanitize";

const sampleDashboard: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong quarter.",
    keyFindings: ["Revenue up"],
    redFlags: [],
    opportunities: [],
  },
  kpis: [{ label: "Revenue", value: "$2.4M", trend: "up", category: "revenue" }],
  charts: [],
  tables: [],
  narrative: "",
};

describe("sanitizePptxHex", () => {
  it("normalizes valid hex", () => {
    expect(sanitizePptxHex("#1D4ED8", "000000")).toBe("1D4ED8");
    expect(sanitizePptxHex("#abc", "000000")).toBe("AABBCC");
  });

  it("falls back on invalid color names", () => {
    expect(sanitizePptxHex("blue", "0F1C35")).toBe("0F1C35");
  });
});

describe("buildAnalysisPptx with brand kit edge cases", () => {
  it("does not throw on invalid brand colors or svg logo", async () => {
    const buf = await buildAnalysisPptx(sampleDashboard, "ru", {
      primaryHex: "not-a-color",
      accentHex: "#ZZZZZZ",
      logoData: { base64: "aGVsbG8=", mime: "image/svg+xml" },
    });
    expect(buf.byteLength).toBeGreaterThan(500);
  });

  it("sanitizePptxBrandAssets drops svg logo", () => {
    const out = sanitizePptxBrandAssets({
      primaryHex: "blue",
      accentHex: "#1D4ED8",
      logoData: { base64: "x", mime: "image/svg+xml" },
    });
    expect(out?.primaryHex).toBe("0F1C35");
    expect(out?.logoData).toBeUndefined();
  });
});

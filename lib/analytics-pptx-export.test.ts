import { describe, it, expect } from "vitest";
import { buildAnalysisPptx } from "./analytics-pptx-export";
import type { AnalysisDashboard } from "./analytics-schema";

const sampleDashboard: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong quarter with 18% revenue growth.",
    keyFindings: ["Revenue up 18%", "Margins improved"],
    redFlags: ["High burn rate"],
    opportunities: ["Expand to EU"],
  },
  kpis: [
    { label: "Revenue", value: "$2.4M", trend: "up", category: "revenue" },
    { label: "EBITDA", value: "$480K", change: "+22%", trend: "up", category: "profitability" },
  ],
  charts: [
    {
      id: "revenue-chart",
      type: "bar",
      title: "Monthly Revenue",
      data: [{ name: "Jan", value: 800000 }, { name: "Feb", value: 850000 }],
    },
  ],
  tables: [],
  narrative: "Full narrative here.",
};

describe("buildAnalysisPptx", () => {
  it("returns a Buffer", async () => {
    const result = await buildAnalysisPptx(sampleDashboard);
    expect(result).toBeInstanceOf(Buffer);
    expect(result.byteLength).toBeGreaterThan(1000);
  });
});

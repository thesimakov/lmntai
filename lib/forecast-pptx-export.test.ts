import { describe, it, expect } from "vitest";
import { buildForecastPptx } from "./forecast-pptx-export";
import type { ForecastReport } from "./forecast-schema";
import type { AnalysisDashboard } from "./analytics-schema";

function makePoint(period: string, isHistorical: boolean) {
  return { period, value: 1000000, isHistorical, low: isHistorical ? undefined : 900000, high: isHistorical ? undefined : 1100000 };
}

const MOCK_REPORT: ForecastReport = {
  generatedAt: "2024-01-15T10:00:00.000Z",
  basePeriod: "2023-12",
  executiveSummary: "Revenue is expected to grow 18% over the next 12 months.",
  metrics: [
    { key: "revenue", label: "Revenue", unit: "$", trend: "up", projectedCagr: "+18%", narrative: "Strong growth expected.", points: [makePoint("2023-10", true), makePoint("2023-11", true), makePoint("2024-01", false), makePoint("2024-02", false)] },
    { key: "ebitda", label: "EBITDA", unit: "$", trend: "up", narrative: "Margins improving.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
    { key: "burn_rate", label: "Burn Rate", unit: "$", trend: "down", narrative: "Burn rate stabilising.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
  ],
};

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: { companyName: "Acme Corp", period: "FY2023", documentType: "P&L", currency: "USD", analyzedAt: "2024-01-15T10:00:00.000Z" },
  summary: { executive: "Good.", keyFindings: [], redFlags: [], opportunities: [] },
  kpis: [],
  charts: [],
  tables: [],
  narrative: "",
};

describe("buildForecastPptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildForecastPptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("handles missing revenue/ebitda metrics gracefully", async () => {
    const noRevenue: ForecastReport = {
      ...MOCK_REPORT,
      metrics: [
        { key: "mrr", label: "MRR", unit: "$", trend: "up", narrative: "Growing.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
        { key: "burn_rate", label: "Burn Rate", unit: "$", trend: "down", narrative: "Stable.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
        { key: "runway", label: "Runway", unit: "months", trend: "neutral", narrative: "14 months.", points: [makePoint("2023-10", true), makePoint("2024-01", false)] },
      ],
    };
    const buf = await buildForecastPptx(noRevenue, MOCK_DASHBOARD);
    expect(buf).toBeInstanceOf(Buffer);
    expect(buf.length).toBeGreaterThan(1000);
  });
});

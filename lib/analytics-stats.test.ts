import { describe, it, expect } from "vitest";
import { computeChartTrend, computeDashboardStats, formatStatsForPrompt } from "./analytics-stats";

const makeChart = (values: number[]) =>
  values.map((v, i) => ({ period: `P${i}`, revenue: v }));

describe("computeChartTrend", () => {
  it("returns null for fewer than 2 points", () => {
    expect(computeChartTrend([])).toBeNull();
    expect(computeChartTrend([{ period: "P0", revenue: 100 }])).toBeNull();
  });

  it("computes positive slope for growing data", () => {
    const data = makeChart([100, 120, 140, 160]);
    const trend = computeChartTrend(data);
    expect(trend).not.toBeNull();
    expect(trend!.slope).toBeGreaterThan(0);
  });

  it("computes CAGR correctly for simple doubling", () => {
    const data = makeChart([100, 200]);
    const trend = computeChartTrend(data);
    expect(trend).not.toBeNull();
    // CAGR over 1 period from 100 to 200 = 100%
    expect(trend!.cagr).toBeCloseTo(1.0, 5);
  });

  it("computes 3-period moving average", () => {
    const data = makeChart([10, 20, 30, 40, 50]);
    const trend = computeChartTrend(data);
    // last 3 values: 30, 40, 50 → avg = 40
    expect(trend!.movingAvg3).toBeCloseTo(40, 5);
  });

  it("projects next period via linear extrapolation", () => {
    // perfect linear: 0, 10, 20, 30 → slope=10, next should be ~40
    const data = makeChart([0, 10, 20, 30]);
    const trend = computeChartTrend(data);
    expect(trend!.projectedNext).toBeCloseTo(40, 0);
  });

  it("returns null CAGR when first value is zero", () => {
    const data = makeChart([0, 10, 20]);
    const trend = computeChartTrend(data);
    expect(trend!.cagr).toBeNull();
  });
});

describe("computeDashboardStats", () => {
  const mockDashboard = {
    meta: {
      companyName: "Test",
      period: "2024",
      currency: "USD",
      documentType: "financial_report",
      analyzedAt: new Date().toISOString(),
    },
    kpis: [{ label: "Revenue", value: "$100K", change: "+15%", trend: "up" as const, category: "revenue" as const }],
    charts: [
      {
        id: "chart-1",
        title: "Monthly Revenue",
        type: "bar" as const,
        data: makeChart([80, 90, 100]),
      },
    ],
    summary: {
      executive: "Good",
      keyFindings: [],
      redFlags: [],
      opportunities: [],
    },
    tables: [],
    narrative: "Test narrative",
  };

  it("computes trends for all charts", () => {
    const stats = computeDashboardStats(mockDashboard);
    expect(stats.chartTrends["Monthly Revenue"]).toBeDefined();
  });

  it("includes KPI summary", () => {
    const stats = computeDashboardStats(mockDashboard);
    expect(stats.kpiSummary).toHaveLength(1);
    expect(stats.kpiSummary[0]!.label).toBe("Revenue");
  });
});

describe("formatStatsForPrompt", () => {
  it("produces non-empty string with chart data", () => {
    const stats = {
      chartTrends: {
        Revenue: {
          slope: 5,
          intercept: 100,
          cagr: 0.1,
          movingAvg3: 130,
          lastValue: 140,
          projectedNext: 145,
          projectedIn3: 155,
        },
      },
      kpiSummary: [{ label: "GMV", value: "$1M", change: "+10%" }],
    };
    const text = formatStatsForPrompt(stats);
    expect(text).toContain("CAGR");
    expect(text).toContain("10.0%");
    expect(text).toContain("GMV");
    expect(text).toContain("+10%");
  });
});

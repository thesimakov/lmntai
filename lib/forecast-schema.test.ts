import { describe, it, expect } from "vitest";
import { forecastReportSchema } from "./forecast-schema";

function makePoint(period: string, isHistorical: boolean) {
  return {
    period,
    value: 1000,
    isHistorical,
    ...(isHistorical ? {} : { low: 900, high: 1100 }),
  };
}

function makeMetric(key: string) {
  return {
    key,
    label: key,
    unit: "$",
    trend: "up" as const,
    narrative: "Test narrative.",
    points: [makePoint("2023-10", true), makePoint("2024-01", false)],
  };
}

const VALID_REPORT = {
  generatedAt: "2024-01-15T10:00:00.000Z",
  basePeriod: "2023-12",
  executiveSummary: "Strong revenue growth expected.",
  metrics: [makeMetric("revenue"), makeMetric("ebitda"), makeMetric("burn_rate")],
};

describe("forecastReportSchema", () => {
  it("accepts a valid report", () => {
    expect(forecastReportSchema.safeParse(VALID_REPORT).success).toBe(true);
  });

  it("rejects fewer than 3 metrics", () => {
    const bad = { ...VALID_REPORT, metrics: [makeMetric("revenue"), makeMetric("ebitda")] };
    expect(forecastReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects more than 5 metrics", () => {
    const bad = {
      ...VALID_REPORT,
      metrics: ["a", "b", "c", "d", "e", "f"].map(makeMetric),
    };
    expect(forecastReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid generatedAt datetime", () => {
    const bad = { ...VALID_REPORT, generatedAt: "not-a-date" };
    expect(forecastReportSchema.safeParse(bad).success).toBe(false);
  });
});

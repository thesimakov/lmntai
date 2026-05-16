import { describe, expect, it } from "vitest";

import { normalizeForecastReport } from "./forecast-report-normalize";

describe("normalizeForecastReport", () => {
  it("repairs invalid trends, points and metric counts", () => {
    const raw = {
      generatedAt: "2026-05-16",
      basePeriod: "2026-Q1",
      executiveSummary: "Forecast summary",
      metrics: [
        {
          key: "revenue",
          label: "Revenue",
          unit: "RUB",
          trend: "рост",
          narrative: "Growing",
          points: [
            { period: "2025-Q4", value: "12000000", isHistorical: "true" },
            { period: "2026-Q2", value: "13000000", isHistorical: false },
          ],
        },
      ],
    };

    const normalized = normalizeForecastReport(raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.metrics.length).toBeGreaterThanOrEqual(3);
    expect(normalized?.metrics[0]?.trend).toBe("up");
    const forecastPoint = normalized?.metrics[0]?.points.find((p) => !p.isHistorical);
    expect(forecastPoint?.low).toBeDefined();
    expect(forecastPoint?.high).toBeDefined();
  });
});

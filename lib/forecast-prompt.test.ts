import { describe, it, expect } from "vitest";
import { buildForecastPrompt } from "./forecast-prompt";
import type { AnalysisDashboard } from "./analytics-schema";

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "FY2023",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-15T10:00:00.000Z",
  },
  summary: {
    executive: "Strong performance.",
    keyFindings: ["Revenue grew 18%"],
    redFlags: [],
    opportunities: ["International expansion"],
  },
  kpis: [],
  charts: [],
  tables: [],
  narrative: "Full narrative here.",
};

describe("buildForecastPrompt", () => {
  it("returns exactly 2 messages", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs).toHaveLength(2);
  });

  it("first message is system role", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs[0].role).toBe("system");
  });

  it("system prompt mentions forecast and 24 months", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs[0].content).toContain("forecast");
    expect(msgs[0].content).toContain("24");
  });

  it("user message contains company name", () => {
    const msgs = buildForecastPrompt(MOCK_DASHBOARD);
    expect(msgs[1].content).toContain("Acme Corp");
  });
});

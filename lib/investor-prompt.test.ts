import { describe, it, expect } from "vitest";
import { buildInvestorPrompt } from "./investor-prompt";
import type { AnalysisDashboard } from "./analytics-schema";

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong quarter.",
    keyFindings: ["Revenue up 18%"],
    redFlags: ["Burn rate increasing"],
    opportunities: ["New market expansion"],
  },
  kpis: [
    { label: "Revenue", value: "$2.4M", change: "+18%", trend: "up", category: "revenue" },
  ],
  charts: [],
  tables: [],
  narrative: "Detailed narrative here.",
};

describe("buildInvestorPrompt", () => {
  it("returns an array with system and user messages", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("includes company name in user message", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages[1].content).toContain("Acme Corp");
  });

  it("system prompt mentions all three formats", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages[0].content).toContain("vcPitch");
    expect(messages[0].content).toContain("boardReport");
    expect(messages[0].content).toContain("dueDiligence");
  });

  it("system prompt mentions riskScore", () => {
    const messages = buildInvestorPrompt(MOCK_DASHBOARD);
    expect(messages[0].content).toContain("riskScore");
  });
});

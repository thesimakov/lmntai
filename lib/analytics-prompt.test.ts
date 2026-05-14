import { describe, it, expect } from "vitest";
import { buildAnalysisPrompt, buildChatPrompt } from "./analytics-prompt";
import type { AnalysisDashboard } from "./analytics-schema";

describe("buildAnalysisPrompt", () => {
  it("returns messages array with system and user roles", () => {
    const result = buildAnalysisPrompt("Revenue: $1M\nCosts: $800K");
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[1].role).toBe("user");
  });

  it("includes the document text in the user message", () => {
    const text = "EBITDA: $200K for Q3";
    const result = buildAnalysisPrompt(text);
    expect(result[1].content).toContain(text);
  });

  it("system prompt requests JSON output", () => {
    const result = buildAnalysisPrompt("some text");
    expect(result[0].content.toLowerCase()).toContain("json");
  });
});

describe("buildChatPrompt", () => {
  const sampleDashboard: AnalysisDashboard = {
    meta: { companyName: "Acme", period: "Q1 2024", documentType: "P&L", currency: "USD", analyzedAt: "2024-01-01T00:00:00.000Z" },
    summary: { executive: "Good quarter.", keyFindings: ["Up 18%"], redFlags: [], opportunities: [] },
    kpis: [{ label: "Revenue", value: "$2M", trend: "up", category: "revenue" }],
    charts: [],
    tables: [],
    narrative: "Full narrative.",
  };

  it("returns messages with system, history, and user message", () => {
    const history = [{ role: "user" as const, content: "What is revenue?" }, { role: "assistant" as const, content: "$2M" }];
    const result = buildChatPrompt(sampleDashboard, "What is EBITDA?", history);
    expect(result[0].role).toBe("system");
    expect(result[result.length - 1].role).toBe("user");
    expect(result[result.length - 1].content).toBe("What is EBITDA?");
  });

  it("system prompt contains dashboard data", () => {
    const result = buildChatPrompt(sampleDashboard, "test", []);
    expect(result[0].content).toContain("Acme");
  });
});

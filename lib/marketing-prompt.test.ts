import { describe, it, expect } from "vitest";
import { buildMarketingPrompt, buildMarketingChatPrompt } from "./marketing-prompt";
import type { MarketingDashboard } from "./marketing-schema";

const minimalDashboard: MarketingDashboard = {
  meta: { companyName: "Acme", period: "Q1 2024", dataSource: "CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: { executive: "Good quarter.", topFindings: ["ROAS up"], recommendations: ["Increase budget"] },
  channels: [{ name: "Google Ads", kpis: [{ label: "ROAS", value: "4x", trend: "up" }], trend: "up", narrative: "Top channel." }],
  kpis: [{ label: "Total Spend", value: "$10K", trend: "neutral" }],
  charts: [],
  narrative: "Overall good.",
};

describe("buildMarketingPrompt", () => {
  it("returns array of messages with system and user roles", () => {
    const messages = buildMarketingPrompt("Channel: Google Ads\nSpend: $10K");
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
  });

  it("includes raw text in user message", () => {
    const rawText = "Google Ads,Spend,Revenue\nSearch,10000,41000";
    const messages = buildMarketingPrompt(rawText);
    expect(messages[1].content).toContain(rawText);
  });

  it("system prompt mentions JSON", () => {
    const messages = buildMarketingPrompt("data");
    expect(messages[0].content).toContain("JSON");
  });
});

describe("buildMarketingChatPrompt", () => {
  it("includes dashboard context in system message", () => {
    const messages = buildMarketingChatPrompt(minimalDashboard, "Which channel is best?", []);
    expect(messages[0].role).toBe("system");
    expect(messages[0].content).toContain("Google Ads");
  });

  it("appends history and user message", () => {
    const history = [{ role: "user" as const, content: "prev question" }, { role: "assistant" as const, content: "prev answer" }];
    const messages = buildMarketingChatPrompt(minimalDashboard, "new question", history);
    const last = messages[messages.length - 1];
    expect(last.role).toBe("user");
    expect(last.content).toBe("new question");
  });
});

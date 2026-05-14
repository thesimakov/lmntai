import { describe, it, expect, beforeEach } from "vitest";
import { useMarketingStore } from "./use-marketing-store";
import type { MarketingDashboard } from "@/lib/marketing-schema";

const minimalDashboard: MarketingDashboard = {
  meta: { companyName: "Acme", period: "Q1 2024", dataSource: "CSV", analyzedAt: "2024-01-01T00:00:00.000Z" },
  summary: { executive: "Good.", topFindings: ["ROAS up"], recommendations: ["More budget"] },
  channels: [{ name: "Google Ads", kpis: [], trend: "up", narrative: "Top." }],
  kpis: [],
  charts: [],
  narrative: "Overall good.",
};

describe("useMarketingStore", () => {
  beforeEach(() => {
    useMarketingStore.getState().reset();
  });

  it("starts idle with no dashboard", () => {
    const { status, dashboard } = useMarketingStore.getState();
    expect(status).toBe("idle");
    expect(dashboard).toBeNull();
  });

  it("setDashboard sets status to ready and clears error", () => {
    useMarketingStore.getState().setError("prev error");
    useMarketingStore.getState().setDashboard(minimalDashboard);
    const { status, dashboard, errorMessage } = useMarketingStore.getState();
    expect(status).toBe("ready");
    expect(dashboard).toEqual(minimalDashboard);
    expect(errorMessage).toBeNull();
  });

  it("setError sets status to error", () => {
    useMarketingStore.getState().setError("something went wrong");
    const { status, errorMessage } = useMarketingStore.getState();
    expect(status).toBe("error");
    expect(errorMessage).toBe("something went wrong");
  });

  it("addChatMessage appends to chatMessages", () => {
    useMarketingStore.getState().addChatMessage({ id: "1", role: "user", content: "Hello" });
    expect(useMarketingStore.getState().chatMessages).toHaveLength(1);
  });

  it("updateLastAssistantMessage updates last assistant content", () => {
    useMarketingStore.getState().addChatMessage({ id: "1", role: "user", content: "Q" });
    useMarketingStore.getState().addChatMessage({ id: "2", role: "assistant", content: "" });
    useMarketingStore.getState().updateLastAssistantMessage("Answer here");
    expect(useMarketingStore.getState().chatMessages[1].content).toBe("Answer here");
  });

  it("reset returns to initial state", () => {
    useMarketingStore.getState().setDashboard(minimalDashboard);
    useMarketingStore.getState().reset();
    expect(useMarketingStore.getState().status).toBe("idle");
    expect(useMarketingStore.getState().dashboard).toBeNull();
  });
});

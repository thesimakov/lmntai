import { describe, it, expect } from "vitest";
import { marketingDashboardSchema } from "./marketing-schema";

const validDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    dataSource: "Google Ads CSV",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: {
    executive: "Strong performance across paid channels.",
    topFindings: ["Google Ads ROAS 4.1x", "Email CAC rising"],
    recommendations: ["Increase Google budget by 15%"],
  },
  channels: [
    {
      name: "Google Ads",
      spend: 12400,
      revenue: 50840,
      kpis: [{ label: "ROAS", value: "4.1x", trend: "up" as const }],
      trend: "up" as const,
      narrative: "Top performer.",
    },
  ],
  kpis: [{ label: "Total Spend", value: "$48.2K", trend: "up" as const }],
  charts: [
    {
      id: "spend-by-channel",
      type: "bar" as const,
      title: "Spend by Channel",
      data: [{ name: "Google Ads", value: 12400 }],
    },
  ],
  narrative: "Overall strong quarter.",
};

describe("marketingDashboardSchema", () => {
  it("validates a correct dashboard", () => {
    const result = marketingDashboardSchema.safeParse(validDashboard);
    expect(result.success).toBe(true);
  });

  it("rejects empty channels array", () => {
    const result = marketingDashboardSchema.safeParse({
      ...validDashboard,
      channels: [],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 6 channels", () => {
    const channel = validDashboard.channels[0];
    const result = marketingDashboardSchema.safeParse({
      ...validDashboard,
      channels: Array(7).fill(channel),
    });
    expect(result.success).toBe(false);
  });

  it("allows optional spend and revenue on channel", () => {
    const { spend: _s, revenue: _r, ...channelWithout } = validDashboard.channels[0];
    const result = marketingDashboardSchema.safeParse({
      ...validDashboard,
      channels: [channelWithout],
    });
    expect(result.success).toBe(true);
  });
});

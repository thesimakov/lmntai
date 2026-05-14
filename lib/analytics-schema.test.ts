import { describe, it, expect } from "vitest";
import { analysisDashboardSchema } from "./analytics-schema";

const minimal: unknown = {
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
    redFlags: [],
    opportunities: ["Expand to EU"],
  },
  kpis: [
    { label: "Revenue", value: "$2.4M", trend: "up", category: "revenue" },
  ],
  charts: [
    {
      id: "rev-chart",
      type: "bar",
      title: "Monthly Revenue",
      data: [{ name: "Jan", value: 800000 }],
    },
  ],
  tables: [],
  narrative: "Full analysis narrative here.",
};

describe("analysisDashboardSchema", () => {
  it("accepts a valid dashboard", () => {
    expect(() => analysisDashboardSchema.parse(minimal)).not.toThrow();
  });

  it("rejects an invalid trend value", () => {
    const bad = structuredClone(minimal) as { kpis: Array<{ trend: string }> };
    bad.kpis[0].trend = "sideways";
    expect(() => analysisDashboardSchema.parse(bad)).toThrow();
  });

  it("rejects missing meta.companyName", () => {
    const bad = structuredClone(minimal) as { meta: Record<string, unknown> };
    delete bad.meta.companyName;
    expect(() => analysisDashboardSchema.parse(bad)).toThrow();
  });
});

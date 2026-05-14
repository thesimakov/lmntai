import { describe, it, expect } from "vitest";
import { investorReportSchema } from "./investor-schema";

const MINIMAL_VALID: unknown = {
  generatedAt: "2024-01-01T00:00:00.000Z",
  riskScore: 65,
  riskLabel: "Medium",
  riskFactors: [{ factor: "High burn rate", severity: "high" }],
  investmentHighlights: ["Strong revenue growth"],
  forecast: {
    horizon: "12m",
    scenarios: {
      optimistic: { revenue: "$5M", ebitda: "$1M", narrative: "Bull case" },
      base: { revenue: "$4M", ebitda: "$500K", narrative: "Base case" },
      pessimistic: { revenue: "$3M", ebitda: "-$200K", narrative: "Bear case" },
    },
  },
  vcPitch: {
    slides: [{ title: "Cover", content: "Company overview" }],
  },
  boardReport: {
    slides: [{ title: "Exec Summary", content: "Overview" }],
  },
  dueDiligence: {
    slides: [{ title: "Overview", content: "DD overview" }],
    keyQuestions: ["What is the runway?"],
    dataRoomChecklist: ["Cap table", "Financials"],
  },
};

describe("investorReportSchema", () => {
  it("accepts valid investor report", () => {
    const result = investorReportSchema.safeParse(MINIMAL_VALID);
    expect(result.success).toBe(true);
  });

  it("rejects riskScore outside 0–100", () => {
    const bad = { ...MINIMAL_VALID as Record<string, unknown>, riskScore: 150 };
    expect(investorReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid riskLabel", () => {
    const bad = { ...MINIMAL_VALID as Record<string, unknown>, riskLabel: "Extreme" };
    expect(investorReportSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects invalid forecast horizon", () => {
    const bad = {
      ...(MINIMAL_VALID as Record<string, unknown>),
      forecast: {
        horizon: "6m",
        scenarios: (MINIMAL_VALID as { forecast: { scenarios: unknown } }).forecast.scenarios,
      },
    };
    expect(investorReportSchema.safeParse(bad).success).toBe(false);
  });
});

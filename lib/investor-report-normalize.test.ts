import { describe, expect, it } from "vitest";

import { normalizeInvestorReport } from "./investor-report-normalize";

describe("normalizeInvestorReport", () => {
  it("repairs localized labels and slide counts", () => {
    const raw = {
      generatedAt: "2026-05-16",
      riskScore: "68",
      riskLabel: "Высокий",
      riskFactors: [{ factor: "Runway risk", severity: "средний" }],
      investmentHighlights: ["Strong retention"],
      forecast: {
        scenarios: {
          optimistic: { revenue: "120M RUB", ebitda: "26M RUB", narrative: "Best case" },
          base: { revenue: "94M RUB", ebitda: "18M RUB", narrative: "Base case" },
          pessimistic: { revenue: "70M RUB", ebitda: "9M RUB", narrative: "Worst case" },
        },
      },
      vcPitch: { slides: [{ title: "Cover", content: "Intro" }] },
      boardReport: { slides: [] },
      dueDiligence: {
        slides: [{ title: "Cover", content: "DD intro" }],
        keyQuestions: ["Question 1"],
        dataRoomChecklist: ["Checklist 1"],
      },
    };

    const normalized = normalizeInvestorReport(raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.riskLabel).toBe("High");
    expect(normalized?.riskFactors[0]?.severity).toBe("medium");
    expect(normalized?.vcPitch.slides).toHaveLength(10);
    expect(normalized?.boardReport.slides).toHaveLength(14);
    expect(normalized?.dueDiligence.slides).toHaveLength(8);
  });
});

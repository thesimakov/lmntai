import { describe, it, expect } from "vitest";
import { buildVcPitchPptx, buildBoardReportPptx, buildDueDiligencePptx } from "./investor-pptx-export";
import type { InvestorReport } from "./investor-schema";
import type { AnalysisDashboard } from "./analytics-schema";

const MOCK_DASHBOARD: AnalysisDashboard = {
  meta: {
    companyName: "Acme Corp",
    period: "Q1 2024",
    documentType: "P&L",
    currency: "USD",
    analyzedAt: "2024-01-01T00:00:00.000Z",
  },
  summary: { executive: "Good quarter.", keyFindings: [], redFlags: [], opportunities: [] },
  kpis: [],
  charts: [],
  tables: [],
  narrative: "Narrative.",
};

const makeSlides = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    title: `Slide ${i + 1}`,
    content: `Content ${i + 1}`,
  }));

const MOCK_REPORT: InvestorReport = {
  generatedAt: "2024-01-01T00:00:00.000Z",
  riskScore: 55,
  riskLabel: "Medium",
  riskFactors: [{ factor: "Burn rate", severity: "medium" }],
  investmentHighlights: ["Strong growth"],
  forecast: {
    horizon: "12m",
    scenarios: {
      optimistic: { revenue: "$5M", ebitda: "$1M", narrative: "Bull" },
      base: { revenue: "$4M", ebitda: "$500K", narrative: "Base" },
      pessimistic: { revenue: "$3M", ebitda: "-$200K", narrative: "Bear" },
    },
  },
  vcPitch: { slides: makeSlides(10) },
  boardReport: { slides: makeSlides(14) },
  dueDiligence: {
    slides: makeSlides(8),
    keyQuestions: ["What is runway?"],
    dataRoomChecklist: ["Cap table"],
  },
};

describe("buildVcPitchPptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildVcPitchPptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});

describe("buildBoardReportPptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildBoardReportPptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});

describe("buildDueDiligencePptx", () => {
  it("returns a non-empty Buffer", async () => {
    const buf = await buildDueDiligencePptx(MOCK_REPORT, MOCK_DASHBOARD);
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(1000);
  });
});

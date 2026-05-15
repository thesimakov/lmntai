import { describe, it, expect } from "vitest";
import { retrieveRelevantChunks } from "./text-rag";

const SAMPLE = `Company: Acme Corp
Period: Q1 2024
Revenue: $5.2M (+18% YoY)
Gross Profit: $2.1M (40% margin)
EBITDA: $800K

Operating expenses increased by 12% due to headcount growth.
Sales and marketing spend was $600K representing 11.5% of revenue.

Balance Sheet: Cash $3.4M, Total Assets $12.1M, Equity $7.3M.
Current ratio is 2.8x indicating healthy short-term solvency.

Customer Metrics: MRR $1.73M, Churn 2.1%, NPS 72, CAC $1,200, LTV $14,400.
LTV/CAC ratio is 12x which is above industry benchmark.

Key risks: Customer concentration (top 3 clients = 45% revenue).
Opportunity: EU market expansion planned for Q3 2024.
Recommendation: Focus on reducing customer concentration risk.`;

describe("retrieveRelevantChunks", () => {
  it("returns chunks relevant to revenue query", () => {
    const chunks = retrieveRelevantChunks(SAMPLE, "revenue growth");
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.join(" ")).toContain("Revenue");
  });

  it("returns chunks relevant to churn query", () => {
    const chunks = retrieveRelevantChunks(SAMPLE, "churn rate customer");
    expect(chunks.join(" ")).toContain("Churn");
  });

  it("respects topK limit", () => {
    const chunks = retrieveRelevantChunks(SAMPLE, "EBITDA margin", 2);
    expect(chunks.length).toBeLessThanOrEqual(2);
  });

  it("handles short text (fewer chunks than topK)", () => {
    const chunks = retrieveRelevantChunks("Revenue: $1M. Net income: $100K.", "revenue");
    expect(chunks.length).toBeGreaterThan(0);
  });

  it("returns empty array for empty text", () => {
    expect(retrieveRelevantChunks("", "revenue")).toEqual([]);
  });
});

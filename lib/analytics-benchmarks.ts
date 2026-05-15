/**
 * Industry benchmark data — medians from public sources
 * (Bessemer Cloud Index, SaaS Capital, McKinsey, Damodaran).
 *
 * Values are medians; ranges bracket the 25th–75th percentile.
 */

export type BenchmarkMetric = {
  label: string;
  median: number;
  unit: "%" | "x" | "months" | "score";
  goodDirection: "higher" | "lower";
  p25: number;
  p75: number;
  description: string;
};

export type IndustryBenchmarks = {
  id: string;
  name: string;
  metrics: BenchmarkMetric[];
};

export const BENCHMARKS: IndustryBenchmarks[] = [
  {
    id: "saas",
    name: "SaaS / Software",
    metrics: [
      { label: "ARR Growth (YoY)", median: 40, unit: "%", goodDirection: "higher", p25: 25, p75: 80, description: "Annual Recurring Revenue growth rate" },
      { label: "Gross Margin", median: 72, unit: "%", goodDirection: "higher", p25: 65, p75: 80, description: "Revenue minus direct COGS" },
      { label: "Net Revenue Retention", median: 110, unit: "%", goodDirection: "higher", p25: 100, p75: 125, description: "NRR incl. expansion and churn" },
      { label: "Rule of 40", median: 38, unit: "score", goodDirection: "higher", p25: 20, p75: 55, description: "ARR growth % + FCF margin %" },
      { label: "CAC Payback (months)", median: 18, unit: "months", goodDirection: "lower", p25: 12, p75: 28, description: "Months to recover customer acquisition cost" },
      { label: "EBITDA Margin", median: -5, unit: "%", goodDirection: "higher", p25: -20, p75: 10, description: "EBITDA as % of revenue" },
      { label: "Burn Multiple", median: 1.5, unit: "x", goodDirection: "lower", p25: 0.8, p75: 2.5, description: "Net burn / Net new ARR" },
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce / Retail",
    metrics: [
      { label: "Revenue Growth (YoY)", median: 20, unit: "%", goodDirection: "higher", p25: 10, p75: 40, description: "Year-over-year revenue growth" },
      { label: "Gross Margin", median: 38, unit: "%", goodDirection: "higher", p25: 28, p75: 50, description: "Revenue minus COGS" },
      { label: "EBITDA Margin", median: 6, unit: "%", goodDirection: "higher", p25: 2, p75: 12, description: "EBITDA as % of revenue" },
      { label: "Net Profit Margin", median: 3, unit: "%", goodDirection: "higher", p25: 0, p75: 8, description: "Net income as % of revenue" },
      { label: "Inventory Turnover", median: 6, unit: "x", goodDirection: "higher", p25: 4, p75: 10, description: "COGS / average inventory" },
      { label: "Return Rate", median: 18, unit: "%", goodDirection: "lower", p25: 10, p75: 30, description: "Orders returned as % of orders shipped" },
    ],
  },
  {
    id: "marketplace",
    name: "Marketplace / Platform",
    metrics: [
      { label: "GMV Growth (YoY)", median: 35, unit: "%", goodDirection: "higher", p25: 20, p75: 70, description: "Gross Merchandise Value growth" },
      { label: "Take Rate", median: 15, unit: "%", goodDirection: "higher", p25: 10, p75: 25, description: "Revenue as % of GMV" },
      { label: "Gross Margin", median: 60, unit: "%", goodDirection: "higher", p25: 45, p75: 72, description: "Net revenue minus direct costs" },
      { label: "EBITDA Margin", median: 5, unit: "%", goodDirection: "higher", p25: -10, p75: 18, description: "EBITDA as % of net revenue" },
      { label: "Supplier/Buyer Ratio", median: 0.3, unit: "x", goodDirection: "lower", p25: 0.1, p75: 0.6, description: "Suppliers per active buyer" },
    ],
  },
  {
    id: "fintech",
    name: "Fintech",
    metrics: [
      { label: "Revenue Growth (YoY)", median: 45, unit: "%", goodDirection: "higher", p25: 25, p75: 90, description: "Year-over-year revenue growth" },
      { label: "Gross Margin", median: 55, unit: "%", goodDirection: "higher", p25: 40, p75: 68, description: "Revenue minus direct financial costs" },
      { label: "EBITDA Margin", median: 10, unit: "%", goodDirection: "higher", p25: -5, p75: 22, description: "EBITDA as % of revenue" },
      { label: "CAC Payback (months)", median: 14, unit: "%", goodDirection: "lower", p25: 8, p75: 24, description: "Months to recover CAC" },
      { label: "Default Rate", median: 2.5, unit: "%", goodDirection: "lower", p25: 1, p75: 5, description: "Loan default rate (lending products)" },
    ],
  },
  {
    id: "services",
    name: "Professional Services",
    metrics: [
      { label: "Revenue Growth (YoY)", median: 12, unit: "%", goodDirection: "higher", p25: 5, p75: 22, description: "Year-over-year revenue growth" },
      { label: "Gross Margin", median: 30, unit: "%", goodDirection: "higher", p25: 20, p75: 42, description: "Revenue minus people costs" },
      { label: "EBITDA Margin", median: 12, unit: "%", goodDirection: "higher", p25: 6, p75: 20, description: "EBITDA as % of revenue" },
      { label: "Utilization Rate", median: 72, unit: "%", goodDirection: "higher", p25: 62, p75: 80, description: "Billable hours / total hours" },
      { label: "Revenue per Employee", median: 120, unit: "x", goodDirection: "higher", p25: 80, p75: 180, description: "Annual revenue per FTE ($K)" },
    ],
  },
  {
    id: "manufacturing",
    name: "Manufacturing / Industrial",
    metrics: [
      { label: "Revenue Growth (YoY)", median: 8, unit: "%", goodDirection: "higher", p25: 3, p75: 15, description: "Year-over-year revenue growth" },
      { label: "Gross Margin", median: 25, unit: "%", goodDirection: "higher", p25: 16, p75: 36, description: "Revenue minus COGS" },
      { label: "EBITDA Margin", median: 10, unit: "%", goodDirection: "higher", p25: 6, p75: 16, description: "EBITDA as % of revenue" },
      { label: "Asset Turnover", median: 0.9, unit: "x", goodDirection: "higher", p25: 0.6, p75: 1.3, description: "Revenue / total assets" },
      { label: "Inventory Days", median: 45, unit: "months", goodDirection: "lower", p25: 30, p75: 70, description: "Days of inventory on hand" },
    ],
  },
];

export type IndustryId = "saas" | "ecommerce" | "marketplace" | "fintech" | "services" | "manufacturing";

const KEYWORD_MAP: Array<{ keywords: string[]; id: IndustryId }> = [
  { keywords: ["saas", "arr", "mrr", "subscription", "software", "cloud", "platform", "api", "churn", "nrr"], id: "saas" },
  { keywords: ["ecommerce", "e-commerce", "retail", "gmv", "orders", "shopify", "marketplace", "inventory", "returns"], id: "ecommerce" },
  { keywords: ["marketplace", "take rate", "gmv", "buyers", "sellers", "listings", "transactions"], id: "marketplace" },
  { keywords: ["fintech", "lending", "loan", "payments", "card", "banking", "credit", "default", "npl"], id: "fintech" },
  { keywords: ["consulting", "agency", "services", "billable", "utilization", "headcount", "professional"], id: "services" },
  { keywords: ["manufacturing", "industrial", "factory", "production", "inventory", "cogs", "units produced"], id: "manufacturing" },
];

export function detectIndustry(text: string): IndustryBenchmarks {
  const lower = text.toLowerCase();
  const scores = KEYWORD_MAP.map(({ keywords, id }) => ({
    id,
    score: keywords.filter((k) => lower.includes(k)).length,
  }));
  scores.sort((a, b) => b.score - a.score);
  const bestId = scores[0]!.score > 0 ? scores[0]!.id : "saas";
  return BENCHMARKS.find((b) => b.id === bestId) ?? BENCHMARKS[0]!;
}

export type BenchmarkComparison = {
  label: string;
  unit: BenchmarkMetric["unit"];
  goodDirection: BenchmarkMetric["goodDirection"];
  median: number;
  p25: number;
  p75: number;
  description: string;
  companyValue: number | null;
  status: "above" | "below" | "on-par" | "unknown";
};

export function matchKpiToBenchmarks(
  kpiText: string,
  benchmarks: IndustryBenchmarks
): BenchmarkComparison[] {
  return benchmarks.metrics.map((bm) => {
    const companyValue = extractNumericValue(kpiText, bm.label);
    let status: BenchmarkComparison["status"] = "unknown";
    if (companyValue !== null) {
      const isGoodHigher = bm.goodDirection === "higher";
      if (companyValue >= bm.p75) status = isGoodHigher ? "above" : "below";
      else if (companyValue <= bm.p25) status = isGoodHigher ? "below" : "above";
      else status = "on-par";
    }
    return { ...bm, companyValue, status };
  });
}

function extractNumericValue(text: string, label: string): number | null {
  const labelWords = label.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const lines = text.toLowerCase().split("\n");
  for (const line of lines) {
    const hasLabel = labelWords.some((w) => line.includes(w));
    if (!hasLabel) continue;
    const match = line.match(/(-?\d[\d,]*\.?\d*)\s*(%|x|k|m|b)?/i);
    if (match) {
      let val = parseFloat(match[1].replace(/,/g, ""));
      const suffix = (match[2] ?? "").toLowerCase();
      if (suffix === "k") val *= 1000;
      if (suffix === "m") val *= 1_000_000;
      if (suffix === "b") val *= 1_000_000_000;
      return val;
    }
  }
  return null;
}

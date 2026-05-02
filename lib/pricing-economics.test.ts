import { describe, expect, it } from "vitest";

import {
  buildTariffEconomics,
  DEFAULT_TARIFF_PRICES_RUB,
  estimateUsageCostRub,
  weightedCogsRubPer1M
} from "@/lib/pricing-economics";

describe("pricing economics", () => {
  it("estimates usage cost by model and token volume", () => {
    const cost = estimateUsageCostRub("openai/gpt-4.1", 500_000);
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeCloseTo(335, 5);
  });

  it("computes weighted cogs for plans", () => {
    expect(weightedCogsRubPer1M("FREE")).toBeCloseTo(623.1, 5);
    expect(weightedCogsRubPer1M("PRO")).toBeCloseTo(635.9, 5);
    expect(weightedCogsRubPer1M("TEAM")).toBeCloseTo(635.9, 5);
  });

  it("builds tariff economics projection rows", () => {
    const rows = buildTariffEconomics(DEFAULT_TARIFF_PRICES_RUB);
    expect(rows).toHaveLength(3);

    const pro = rows.find((x) => x.plan === "PRO");
    const team = rows.find((x) => x.plan === "TEAM");
    const free = rows.find((x) => x.plan === "FREE");

    expect(free?.projectedMonthlyCogsRub).toBeCloseTo(0.00623, 5);
    expect(pro?.projectedMonthlyCogsRub).toBeCloseTo(317.95, 2);
    expect(team?.projectedMonthlyCogsRub).toBeCloseTo(1271.8, 1);
    expect(pro?.projectedMarginRub).toBeGreaterThan(0);
    expect(team?.projectedMarginRub).toBeGreaterThan(0);
    expect(free?.monthlyPriceRub).toBe(0);
  });
});

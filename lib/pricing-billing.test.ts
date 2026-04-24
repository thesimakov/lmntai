import { describe, expect, it } from "vitest";
import { subscriptionBillingMinor } from "./pricing-billing";

describe("subscriptionBillingMinor", () => {
  it("keeps month as base minor units for monthly", () => {
    const m = 199_000;
    const r = subscriptionBillingMinor(m, "monthly");
    expect(r).toEqual({
      totalMinor: m,
      periodMonths: 1,
      effectiveMonthlyMinor: m,
    });
  });

  it("applies 10% off 3 months", () => {
    const m = 100;
    const r = subscriptionBillingMinor(m, "quarter");
    expect(r.periodMonths).toBe(3);
    expect(r.totalMinor).toBe(Math.round(100 * 3 * 0.9));
    expect(r.effectiveMonthlyMinor).toBe(Math.round(r.totalMinor / 3));
  });

  it("applies 15% off 12 months", () => {
    const m = 100;
    const r = subscriptionBillingMinor(m, "yearly");
    expect(r.periodMonths).toBe(12);
    expect(r.totalMinor).toBe(Math.round(100 * 12 * 0.85));
    expect(r.effectiveMonthlyMinor).toBe(Math.round(r.totalMinor / 12));
  });
});

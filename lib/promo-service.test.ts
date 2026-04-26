import { describe, expect, it } from "vitest";

import { buildPlanPromoPreview } from "./promo-service";
import type { PromoCode } from "@prisma/client";

function row(p: Partial<PromoCode> & Pick<PromoCode, "kind" | "code">): PromoCode {
  return {
    id: "1",
    isActive: true,
    discountPercent: null,
    bonusTokens: null,
    appliesToPlans: null,
    maxUses: null,
    usedCount: 0,
    validFrom: null,
    validTo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...p
  } as PromoCode;
}

describe("buildPlanPromoPreview", () => {
  it("applies 20% discount to monthly pro total", () => {
    const r = buildPlanPromoPreview(
      row({ code: "X", kind: "DISCOUNT", discountPercent: 20 }),
      "PRO",
      "monthly",
      "ru"
    );
    expect(r.applicable).toBe(true);
    expect(r.kind).toBe("DISCOUNT");
    expect(r.originalMinor).toBeGreaterThan(0);
    expect(r.totalMinor).toBe(Math.round((r.originalMinor * 80) / 100));
  });

  it("excludes pro when only TEAM in appliesToPlans", () => {
    const r = buildPlanPromoPreview(
      row({ code: "X", kind: "DISCOUNT", discountPercent: 10, appliesToPlans: ["TEAM"] }),
      "PRO",
      "monthly",
      "ru"
    );
    expect(r.applicable).toBe(false);
  });
});

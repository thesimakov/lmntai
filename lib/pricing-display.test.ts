import { describe, expect, it } from "vitest";

import { buildPricingDisplay } from "@/lib/pricing-display";
import { tokenPackPriceMinor } from "@/lib/referral-token-packs";
import { convertMinorCurrency } from "@/lib/referrals-currency";

describe("pricing display", () => {
  it("returns RUB prices for Russian UI", () => {
    const payload = buildPricingDisplay("ru");
    expect(payload.language).toBe("ru");
    expect(payload.currency).toBe("RUB");
    expect(payload.subscriptions.starter.amountMinor).toBe(9_900);
    expect(payload.subscriptions.pro.amountMinor).toBe(199_000);
    expect(payload.subscriptions.team.amountMinor).toBe(499_000);
  });

  it("returns USD prices for English UI and matches pack billing", () => {
    const payload = buildPricingDisplay("en");
    expect(payload.language).toBe("en");
    expect(payload.currency).toBe("USD");
    expect(payload.subscriptions.starter.amountMinor).toBe(
      convertMinorCurrency(9_900, "RUB", "USD").amountMinor
    );
    expect(payload.packs.starter.priceMinor).toBe(tokenPackPriceMinor("starter", "USD"));
    expect(payload.packs.optimal.priceMinor).toBe(tokenPackPriceMinor("optimal", "USD"));
    expect(payload.packs.max.priceMinor).toBe(tokenPackPriceMinor("max", "USD"));
  });

  it("returns TJS prices for Tajik UI and matches pack billing", () => {
    const payload = buildPricingDisplay("tg");
    expect(payload.language).toBe("tg");
    expect(payload.currency).toBe("TJS");
    expect(payload.subscriptions.starter.amountMinor).toBe(
      convertMinorCurrency(9_900, "RUB", "TJS").amountMinor
    );
    expect(payload.packs.starter.priceMinor).toBe(tokenPackPriceMinor("starter", "TJS"));
    expect(payload.packs.optimal.priceMinor).toBe(tokenPackPriceMinor("optimal", "TJS"));
    expect(payload.packs.max.priceMinor).toBe(tokenPackPriceMinor("max", "TJS"));
  });
});

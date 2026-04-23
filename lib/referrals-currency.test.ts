import { describe, expect, it } from "vitest";

import {
  convertMinorCurrency,
  referralCurrencyForLanguage
} from "@/lib/referrals-currency";

describe("referrals currency policy", () => {
  it("maps ui language to required wallet currency", () => {
    expect(referralCurrencyForLanguage("ru")).toBe("RUB");
    expect(referralCurrencyForLanguage("tg")).toBe("TJS");
    expect(referralCurrencyForLanguage("en")).toBe("USD");
  });

  it("converts using configured fixed rates", () => {
    const usd = convertMinorCurrency(9_200, "RUB", "USD");
    expect(usd.amountMinor).toBe(100);
    const tjs = convertMinorCurrency(100, "USD", "TJS");
    expect(tjs.amountMinor).toBeGreaterThan(0);
  });
});

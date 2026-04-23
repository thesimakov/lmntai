import { describe, expect, it } from "vitest";

import { canRequestWithdrawal } from "@/lib/referral-wallet";

describe("partner withdrawal rules", () => {
  it("allows withdrawals only for partners", () => {
    expect(canRequestWithdrawal(true)).toBe(true);
    expect(canRequestWithdrawal(false)).toBe(false);
  });
});

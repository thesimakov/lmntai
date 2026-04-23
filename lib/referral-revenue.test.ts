import { describe, expect, it } from "vitest";

import { calculateReferralRewardMinor } from "@/lib/referral-revenue";

describe("referral revenue calculation", () => {
  it("calculates 5% reward in minor units", () => {
    expect(calculateReferralRewardMinor(10_000)).toBe(500);
    expect(calculateReferralRewardMinor(19_900)).toBe(995);
  });

  it("returns zero for invalid values", () => {
    expect(calculateReferralRewardMinor(0)).toBe(0);
    expect(calculateReferralRewardMinor(-10)).toBe(0);
  });
});

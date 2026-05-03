import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  STARTER_TOKENS_PER_DAY_PAID,
  STARTER_TOKENS_PER_DAY_TRIAL,
  STARTER_TRIAL_MS,
  getStarterTrialEndsAt,
  isStarterCabinetBlocked,
  starterDailyTokenCap,
  starterPaidSubscriptionActive,
  starterTrialActive,
} from "@/lib/starter-plan";

function user(
  partial: Partial<{ plan: string; role: string; createdAt: Date; starterPaidUntil: Date | null }>
) {
  const createdAt = partial.createdAt ?? new Date("2026-01-01T12:00:00.000Z");
  return {
    plan: partial.plan ?? "FREE",
    role: partial.role ?? "USER",
    createdAt,
    starterPaidUntil: partial.starterPaidUntil ?? null,
  };
}

describe("starter plan gates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("trial duration matches STARTER_TRIAL_MS from createdAt", () => {
    const u = user({ createdAt: new Date("2026-03-10T00:00:00.000Z") });
    const ends = getStarterTrialEndsAt(u);
    expect(ends.getTime() - u.createdAt.getTime()).toBe(STARTER_TRIAL_MS);
  });

  it("within trial: not blocked, trial cap", () => {
    const createdAt = new Date("2026-05-01T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-05-03T00:00:00.000Z"));
    const u = user({ createdAt });
    expect(starterTrialActive(u)).toBe(true);
    expect(isStarterCabinetBlocked(u)).toBe(false);
    expect(starterDailyTokenCap(u)).toBe(STARTER_TOKENS_PER_DAY_TRIAL);
  });

  it("after trial without subscription: blocked, zero daily cap", () => {
    const createdAt = new Date("2026-05-01T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-05-09T12:00:00.000Z"));
    const u = user({ createdAt });
    expect(starterTrialActive(u)).toBe(false);
    expect(isStarterCabinetBlocked(u)).toBe(true);
    expect(starterDailyTokenCap(u)).toBe(0);
  });

  it("starterPaidUntil restores access and paid token cap", () => {
    const createdAt = new Date("2020-01-01T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
    const u = user({
      createdAt,
      starterPaidUntil: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(starterPaidSubscriptionActive(u.starterPaidUntil)).toBe(true);
    expect(isStarterCabinetBlocked(u)).toBe(false);
    expect(starterDailyTokenCap(u)).toBe(STARTER_TOKENS_PER_DAY_PAID);
  });

  it("ADMIN is never blocked on FREE", () => {
    const createdAt = new Date("2010-01-01T00:00:00.000Z");
    vi.setSystemTime(new Date("2026-06-01T00:00:00.000Z"));
    const u = user({ role: "ADMIN", createdAt });
    expect(isStarterCabinetBlocked(u)).toBe(false);
  });
});

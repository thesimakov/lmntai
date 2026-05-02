import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  addOneCalendarMonthKey,
  calendarMonthKeyFromLocal,
  countCalendarMonthlyGrantsToApply,
} from "@/lib/token-monthly-rollover";

describe("token monthly rollover", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("addOne advances month/year", () => {
    expect(addOneCalendarMonthKey("2025-12")).toBe("2026-01");
    expect(addOneCalendarMonthKey("2026-02")).toBe("2026-03");
  });

  it("calendarMonthKey follows local timezone", () => {
    vi.setSystemTime(new Date("2026-07-03T14:00:00.000"));
    expect(calendarMonthKeyFromLocal()).toBe("2026-07");
  });

  it("counts elapsed calendar months inclusive of current boundary", () => {
    expect(countCalendarMonthlyGrantsToApply(null, "2026-05")).toBe(0);
    expect(countCalendarMonthlyGrantsToApply("2026-05", "2026-05")).toBe(0);
    expect(countCalendarMonthlyGrantsToApply("2026-04", "2026-05")).toBe(1);
    expect(countCalendarMonthlyGrantsToApply("2026-03", "2026-06")).toBe(3);
  });
});

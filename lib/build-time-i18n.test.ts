import { describe, expect, it } from "vitest";

import { formatBuildElapsed, formatBuildTotalDuration } from "./build-time-i18n";

describe("formatBuildElapsed", () => {
  it("localizes zero", () => {
    expect(formatBuildElapsed(0, "en")).toBe("0s");
    expect(formatBuildElapsed(0, "ru")).toBe("0 с");
  });
});

describe("formatBuildTotalDuration", () => {
  it("localizes under one second", () => {
    expect(formatBuildTotalDuration(500, "en")).toBe("less than 1 s");
    expect(formatBuildTotalDuration(500, "ru")).toBe("менее 1 с");
  });
});

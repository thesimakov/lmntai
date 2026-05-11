import { describe, expect, it } from "vitest";

import { disallowPathForPublishedNoIndexPage, normalizeStoredRobotsOverride } from "@/lib/cms-robots-site";

describe("cms-robots-site", () => {
  it("disallowPath skips root and builds path", () => {
    expect(disallowPathForPublishedNoIndexPage("/")).toBeNull();
    expect(disallowPathForPublishedNoIndexPage("/blog/")).toBe("Disallow: /blog");
    expect(disallowPathForPublishedNoIndexPage("pricing")).toBe("Disallow: /pricing");
  });

  it("normalizeStoredRobotsOverride enforces max length and empty", () => {
    expect(normalizeStoredRobotsOverride("")).toBeNull();
    expect(normalizeStoredRobotsOverride("   ")).toBeNull();
    expect(normalizeStoredRobotsOverride("User-agent: *\nAllow: /")).toContain("User-agent");
    expect(normalizeStoredRobotsOverride("x".repeat(50_000))).toBeNull();
  });
});

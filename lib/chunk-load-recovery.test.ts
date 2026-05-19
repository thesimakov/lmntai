import { describe, expect, it } from "vitest";
import { isChunkLoadFailure, isNextStaticChunkUrl } from "./chunk-load-recovery";

describe("chunk-load-recovery", () => {
  it("detects ChunkLoadError by name and message", () => {
    expect(isChunkLoadFailure(new Error("Loading chunk 8986 failed."))).toBe(true);
    const named = new Error("Loading chunk failed");
    named.name = "ChunkLoadError";
    expect(isChunkLoadFailure(named)).toBe(true);
    expect(isChunkLoadFailure("failed to fetch dynamically imported module")).toBe(true);
    expect(isChunkLoadFailure(new Error("network error"))).toBe(false);
  });

  it("detects next static chunk urls", () => {
    expect(
      isNextStaticChunkUrl(
        "https://lemnity.com/_next/static/chunks/app/(dashboard)/playground/page-720eae4e43dd6ad3.js"
      )
    ).toBe(true);
    expect(isNextStaticChunkUrl("https://lemnity.com/api/auth/session")).toBe(false);
  });
});

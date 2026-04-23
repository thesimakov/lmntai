import { describe, expect, it } from "vitest";

import { buildPublicSharePageUrl, resolveShareablePreviewUrl } from "./preview-share";

describe("resolveShareablePreviewUrl", () => {
  it("returns null for empty", () => {
    expect(resolveShareablePreviewUrl(null, "https://app.test")).toBeNull();
  });

  it("keeps absolute https", () => {
    expect(resolveShareablePreviewUrl("https://ex.com/p", "https://app.test")).toBe("https://ex.com/p");
  });

  it("joins relative path to origin", () => {
    expect(resolveShareablePreviewUrl("/prev", "https://app.test")).toBe("https://app.test/prev");
  });
});

describe("buildPublicSharePageUrl", () => {
  it("builds /share path", () => {
    expect(buildPublicSharePageUrl("https://x.com", "abc-123")).toBe("https://x.com/share/abc-123");
  });
});

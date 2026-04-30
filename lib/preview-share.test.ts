import { describe, expect, it } from "vitest";

import { PUBLISH_BUILTIN_BASE_DOMAIN } from "./publish-host";
import {
  buildBuiltinPublishBrowseUrl,
  buildPublicSharePageUrl,
  originHostnameServesBuiltinPublishWildcard,
  resolveShareablePreviewUrl
} from "./preview-share";

const sampleBuiltinFqdn = `foo.${PUBLISH_BUILTIN_BASE_DOMAIN}`;
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

describe("buildBuiltinPublishBrowseUrl", () => {
  it("uses /share on localhost even for builtin host", () => {
    expect(buildBuiltinPublishBrowseUrl("http://localhost:3000", "abc-123", sampleBuiltinFqdn)).toBe(
      "http://localhost:3000/share/abc-123"
    );
  });

  it("uses https builtin host when hostname is under publish base domain", () => {
    expect(
      buildBuiltinPublishBrowseUrl(`https://app.${PUBLISH_BUILTIN_BASE_DOMAIN}`, "abc-123", sampleBuiltinFqdn)
    ).toBe(`https://${sampleBuiltinFqdn}`);
  });
});

describe("originHostnameServesBuiltinPublishWildcard", () => {
  it("rejects localhost", () => {
    expect(originHostnameServesBuiltinPublishWildcard("localhost")).toBe(false);
  });

  it("accepts subdomain of publish apex", () => {
    expect(originHostnameServesBuiltinPublishWildcard(`studio.${PUBLISH_BUILTIN_BASE_DOMAIN}`)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { PUBLISH_BUILTIN_BASE_DOMAIN } from "./publish-host";
import {
  buildBuiltinPublishBrowseUrl,
  buildPublicSharePageUrl,
  originHostnameServesBuiltinPublishWildcard,
  resolvePublishOpenUrl,
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

describe("resolvePublishOpenUrl", () => {
  it("uses share URL for builtin subdomain even when preferred is https", () => {
    expect(
      resolvePublishOpenUrl(
        "http://localhost:3001",
        "sandbox-1",
        `https://project-fec378.${PUBLISH_BUILTIN_BASE_DOMAIN}`
      )
    ).toBe("http://localhost:3001/share/sandbox-1");
  });

  it("opens builtin subdomain when app origin is already on publish zone (DNS OK)", () => {
    const preferred = `https://project-abc.${PUBLISH_BUILTIN_BASE_DOMAIN}`;
    expect(resolvePublishOpenUrl(`https://${PUBLISH_BUILTIN_BASE_DOMAIN}`, "sandbox-1", preferred)).toBe(preferred);
    expect(resolvePublishOpenUrl(`https://www.${PUBLISH_BUILTIN_BASE_DOMAIN}`, "sandbox-1", preferred)).toBe(
      preferred
    );
    expect(resolvePublishOpenUrl(`https://studio.${PUBLISH_BUILTIN_BASE_DOMAIN}`, "sandbox-1", preferred)).toBe(
      preferred
    );
  });

  it("opens custom host as-is", () => {
    expect(resolvePublishOpenUrl("https://app.example.com", "sb", "https://app.customer.com")).toBe(
      "https://app.customer.com"
    );
  });

  it("falls back when preferred invalid", () => {
    expect(resolvePublishOpenUrl("https://x.com", "sb", "not-a-url")).toBe("https://x.com/share/sb");
  });
});

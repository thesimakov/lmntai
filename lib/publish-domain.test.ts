import { describe, expect, it, afterEach, vi } from "vitest";

import { getAppHosts, normalizeHost } from "@/lib/publish-domain";
import { normalizePublishCustomHost } from "@/lib/publish-host";

describe("getAppHosts", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("registers www and apex variants from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.example-app.com");
    vi.stubEnv("NEXTAUTH_URL", "");
    const hosts = getAppHosts();
    expect(hosts.has("www.example-app.com")).toBe(true);
    expect(hosts.has("example-app.com")).toBe(true);
  });

  it("registers www when SITE_URL uses apex", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example-app.com");
    vi.stubEnv("NEXTAUTH_URL", "");
    const hosts = getAppHosts();
    expect(hosts.has("example-app.com")).toBe(true);
    expect(hosts.has("www.example-app.com")).toBe(true);
  });
});

describe("publish host normalization", () => {
  it("normalizes full custom hosts", () => {
    expect(normalizePublishCustomHost("https://App.Example.com/path")).toBe("app.example.com");
    expect(normalizePublishCustomHost("client.example.com")).toBe("client.example.com");
  });

  it("normalizes resolver hosts: localhost is valid, garbage rejected", () => {
    expect(normalizeHost("localhost")).toBe("localhost");
    expect(normalizeHost("127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeHost("bad host")).toBeNull();
    expect(normalizeHost("demo.example.com")).toBe("demo.example.com");
  });
});

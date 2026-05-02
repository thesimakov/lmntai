import { describe, expect, it } from "vitest";

import { normalizeHost } from "@/lib/publish-domain";
import { normalizePublishCustomHost } from "@/lib/publish-host";

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

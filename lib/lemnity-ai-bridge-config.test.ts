import { afterEach, describe, expect, it } from "vitest";

import {
  getLemnityAiUpstreamBaseUrl,
  isLemnityAiBridgeEnabledClient,
  isLemnityAiBridgeEnabledServer
} from "@/lib/lemnity-ai-bridge-config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Lemnity AI bridge config", () => {
  it("reads bridge flags from env (primary names)", () => {
    process.env.LEMNITY_AI_BRIDGE_ENABLED = "true";
    process.env.NEXT_PUBLIC_LEMNITY_AI_BRIDGE_ENABLED = "1";

    expect(isLemnityAiBridgeEnabledServer()).toBe(true);
    expect(isLemnityAiBridgeEnabledClient()).toBe(true);
  });

  it("falls back to legacy MANUS_* env names", () => {
    delete process.env.LEMNITY_AI_BRIDGE_ENABLED;
    delete process.env.NEXT_PUBLIC_LEMNITY_AI_BRIDGE_ENABLED;
    process.env.MANUS_FULL_PARITY_ENABLED = "1";
    process.env.NEXT_PUBLIC_MANUS_FULL_PARITY_ENABLED = "yes";

    expect(isLemnityAiBridgeEnabledServer()).toBe(true);
    expect(isLemnityAiBridgeEnabledClient()).toBe(true);
  });

  it("normalizes upstream base url", () => {
    process.env.LEMNITY_AI_UPSTREAM_URL = "https://builder.example.com////";
    expect(getLemnityAiUpstreamBaseUrl()).toBe("https://builder.example.com");
  });

  it("falls back MANUS_API_BASE_URL for upstream", () => {
    delete process.env.LEMNITY_AI_UPSTREAM_URL;
    process.env.MANUS_API_BASE_URL = "https://legacy.example.com/";
    expect(getLemnityAiUpstreamBaseUrl()).toBe("https://legacy.example.com");
  });
});

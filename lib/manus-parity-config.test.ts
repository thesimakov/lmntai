import { afterEach, describe, expect, it } from "vitest";

import {
  buildManusFrontendLaunchUrl,
  getManusApiBaseUrl,
  isManusFullParityEnabledClient,
  isManusFullParityEnabledServer
} from "@/lib/manus-parity-config";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("manus parity config", () => {
  it("reads parity flags from env", () => {
    process.env.MANUS_FULL_PARITY_ENABLED = "true";
    process.env.NEXT_PUBLIC_MANUS_FULL_PARITY_ENABLED = "1";

    expect(isManusFullParityEnabledServer()).toBe(true);
    expect(isManusFullParityEnabledClient()).toBe(true);
  });

  it("normalizes manus api base url", () => {
    process.env.MANUS_API_BASE_URL = "https://manus.example.com////";
    expect(getManusApiBaseUrl()).toBe("https://manus.example.com");
  });

  it("builds launch url with prompt and kind", () => {
    process.env.NEXT_PUBLIC_MANUS_FRONTEND_URL = "https://manus.example.com/chat";
    const url = buildManusFrontendLaunchUrl({
      idea: "Лендинг для студии",
      projectKind: "website"
    });
    expect(url).toContain("https://manus.example.com/chat");
    expect(url).toContain("projectKind=website");
    expect(url).toContain("prompt=");
  });
});

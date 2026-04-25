import { afterEach, describe, expect, it, vi } from "vitest";

import { buildPromptModelFallbackChain } from "@/lib/prompt-model-fallback";

describe("buildPromptModelFallbackChain", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns default DeepSeek free chain", () => {
    const chain = buildPromptModelFallbackChain("openai/gpt-4.1");
    expect(chain).toEqual(["deepseek/deepseek-r1:free", "openrouter/free", "openai/gpt-4.1"]);
  });

  it("supports env overrides and deduplicates values", () => {
    vi.stubEnv("ROUTERAI_PROMPT_FREE_MODEL", "deepseek/deepseek-v3:free");
    vi.stubEnv("ROUTERAI_PROMPT_FREE_FALLBACKS", "openrouter/free, openrouter/free ,openai/gpt-4.1");

    const chain = buildPromptModelFallbackChain("openai/gpt-4.1");
    expect(chain).toEqual(["deepseek/deepseek-v3:free", "openrouter/free", "openai/gpt-4.1"]);
  });
});

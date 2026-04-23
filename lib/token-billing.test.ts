import { describe, expect, it } from "vitest";

import { estimateUsageFromText, normalizeUsage } from "@/lib/token-billing";

describe("token billing helpers", () => {
  it("normalizes usage totals", () => {
    const usage = normalizeUsage({ prompt_tokens: 10, completion_tokens: 30, total_tokens: 0 });
    expect(usage.total_tokens).toBe(40);
  });

  it("estimates usage from prompt/completion text", () => {
    const usage = estimateUsageFromText("hello world", "generated content");
    expect(usage.prompt_tokens).toBeGreaterThan(0);
    expect(usage.completion_tokens).toBeGreaterThan(0);
    expect(usage.total_tokens).toBe(usage.prompt_tokens + usage.completion_tokens);
  });
});

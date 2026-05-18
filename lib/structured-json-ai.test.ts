import { describe, expect, it } from "vitest";

import { userFacingAiUnavailableMessage } from "@/lib/ai-unavailable-message";
import { buildStructuredJsonModelChain } from "@/lib/structured-json-ai";

describe("buildStructuredJsonModelChain", () => {
  it("prefers Gemini 3 Pro for presentations on PRO plan", () => {
    const chain = buildStructuredJsonModelChain("PRO", "presentation");
    expect(chain[0]).toBe("google/gemini-3.1-pro-preview");
    expect(chain).toContain("anthropic/claude-sonnet-4.5");
  });

  it("respects agentHint in model chain", () => {
    const chain = buildStructuredJsonModelChain("PRO", "presentation", {
      agentHint: "Claude Sonnet 4.5",
    });
    expect(chain[0]).toBe("anthropic/claude-sonnet-4.5");
  });
});

describe("userFacingAiUnavailableMessage", () => {
  it("maps missing gateway config", () => {
    expect(
      userFacingAiUnavailableMessage(new Error("AI_GATEWAY_BASE_URL или AI_GATEWAY_API_KEY не заданы."))
    ).toContain("AI_GATEWAY");
  });

  it("passes through short router errors", () => {
    expect(userFacingAiUnavailableMessage(new Error('{"error":"model not found"}'))).toBe(
      '{"error":"model not found"}'
    );
  });
});

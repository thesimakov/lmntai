import { describe, expect, it } from "vitest";

import {
  extractLatestLemnityAiArtifactSandboxIdFromSessionEvents,
  valueLooksLikeApiErrorJsonEnvelope
} from "@/lib/lemnity-ai-bridge-session-artifact";

describe("valueLooksLikeApiErrorJsonEnvelope", () => {
  it("detects compact apiError body", () => {
    expect(valueLooksLikeApiErrorJsonEnvelope('{"error":"Not found"}')).toBe(true);
  });

  it("detects with extra keys", () => {
    expect(valueLooksLikeApiErrorJsonEnvelope('{"error":"Not found","code":"X"}')).toBe(true);
  });

  it("detects case variants", () => {
    expect(valueLooksLikeApiErrorJsonEnvelope('{\n  "error": "NOT FOUND"\n}')).toBe(true);
  });

  it("ignores non-errors", () => {
    expect(valueLooksLikeApiErrorJsonEnvelope("<html><body>x</body></html>")).toBe(false);
    expect(valueLooksLikeApiErrorJsonEnvelope('{"ok":true}')).toBe(false);
  });
});

describe("extractLatestLemnityAiArtifactSandboxIdFromSessionEvents", () => {
  it("uses preview sandboxId", () => {
    const events = [{ event: "message", data: {} }, { event: "preview", data: { sandboxId: "artifact_x" } }];
    expect(extractLatestLemnityAiArtifactSandboxIdFromSessionEvents(events)).toBe("artifact_x");
  });

  it("parses artifact from previewUrl", () => {
    const events = [
      {
        event: "preview",
        data: {
          sandboxId: "wrong-uuid",
          previewUrl: "/api/lemnity-ai/artifacts/artifact_abc123"
        }
      }
    ];
    expect(extractLatestLemnityAiArtifactSandboxIdFromSessionEvents(events)).toBe("artifact_abc123");
  });
});

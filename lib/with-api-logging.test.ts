import { describe, expect, it } from "vitest";

import { shouldRedactBodyPath } from "@/lib/with-api-logging";

describe("api logging redaction", () => {
  it("redacts legacy router payloads", () => {
    expect(shouldRedactBodyPath("/api/generate-stream", "POST", "/api/generate-stream")).toBe(true);
    expect(shouldRedactBodyPath("/api/prompt-builder", "POST", "/api/prompt-builder")).toBe(true);
  });

  it("redacts bridge chat payload", () => {
    expect(
      shouldRedactBodyPath(
        "/api/lemnity-ai/[...path]",
        "POST",
        "/api/lemnity-ai/sessions/abc123/chat"
      )
    ).toBe(true);
  });

  it("does not redact non-chat bridge endpoints", () => {
    expect(
      shouldRedactBodyPath(
        "/api/lemnity-ai/[...path]",
        "GET",
        "/api/lemnity-ai/sessions/abc123"
      )
    ).toBe(false);
    expect(
      shouldRedactBodyPath(
        "/api/lemnity-ai/[...path]",
        "POST",
        "/api/lemnity-ai/sessions/abc123/share"
      )
    ).toBe(false);
  });
});

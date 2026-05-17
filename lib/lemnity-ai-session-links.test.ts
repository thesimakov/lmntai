import { describe, it, expect } from "vitest";

import { lemnityAiUpstreamPathForSession } from "./lemnity-ai-session-links";

describe("lemnityAiUpstreamPathForSession", () => {
  it("rewrites session id in path when effective upstream id differs", () => {
    const path = ["sessions", "dashboard-project-id", "chat"];
    expect(lemnityAiUpstreamPathForSession(path, "upstream-manus-id")).toBe(
      "/sessions/upstream-manus-id/chat"
    );
  });

  it("keeps path when ids already match", () => {
    const path = ["sessions", "same-id"];
    expect(lemnityAiUpstreamPathForSession(path, "same-id")).toBe("/sessions/same-id");
  });
});

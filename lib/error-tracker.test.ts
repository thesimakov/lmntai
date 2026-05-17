import { describe, it, expect } from "vitest";
import { buildPayload } from "./error-tracker";

describe("buildPayload", () => {
  it("truncates message longer than 1000 chars", () => {
    const long = "x".repeat(2000);
    const p = buildPayload({ source: "client", errorType: "js_exception", message: long });
    expect(p.message.length).toBeLessThanOrEqual(1000);
    expect(p.message.endsWith("…")).toBe(true);
  });

  it("truncates stack longer than 8000 chars", () => {
    const stack = "s".repeat(10_000);
    const p = buildPayload({ source: "client", errorType: "js_exception", message: "e", stack });
    expect((p.stack ?? "").length).toBeLessThanOrEqual(8000);
  });

  it("leaves short messages unchanged", () => {
    const p = buildPayload({ source: "server", errorType: "api_5xx", message: "short" });
    expect(p.message).toBe("short");
  });

  it("preserves source and errorType", () => {
    const p = buildPayload({ source: "ai", errorType: "ai_stream", message: "stream broke" });
    expect(p.source).toBe("ai");
    expect(p.errorType).toBe("ai_stream");
  });

  it("passes meta through", () => {
    const meta = { aiModel: "claude-opus-4-7", sandboxId: "sb_abc" };
    const p = buildPayload({ source: "ai", errorType: "ai_stream", message: "e", meta });
    expect(p.meta).toEqual(meta);
  });
});

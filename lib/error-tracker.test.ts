import { describe, it, expect, vi, afterEach } from "vitest";
import { buildPayload, errorTracker, ErrorTracker } from "./error-tracker";

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

  it("buildPayload fills module from pathname when not provided", () => {
    vi.stubGlobal("window", {
      ...globalThis.window,
      location: { pathname: "/playground/build", href: "http://localhost/playground/build" },
      innerWidth: 1280,
      innerHeight: 720,
    });
    const p = buildPayload({ source: "client", errorType: "js_exception", message: "err" });
    expect(p.module).toBe("build_editor");
    vi.unstubAllGlobals();
  });
});

describe("errorTracker", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("report enqueues when flush fails", async () => {
    vi.stubGlobal("navigator", {
      sendBeacon: vi.fn().mockReturnValue(false),
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

    const payload = buildPayload({ source: "client", errorType: "js_exception", message: "test" });
    errorTracker.report(payload);

    // Wait a tick for the rejected promise to settle
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Access internal queue via cast to verify enqueue occurred
    const tracker = errorTracker as unknown as { queue: unknown[] };
    expect(tracker.queue.length).toBeGreaterThan(0);
  });

  it("interceptFetch reports 5xx responses", async () => {
    const tracker = new ErrorTracker();
    const reported: import("./error-tracker-types").ErrorReportPayload[] = [];
    tracker.report = (p) => { reported.push(p); };
    const mockFetch = async () => new Response(null, { status: 500 });
    vi.stubGlobal("window", {
      fetch: mockFetch,
      location: { pathname: "/", href: "http://localhost/" },
      innerWidth: 1280,
      innerHeight: 720,
    });
    tracker.interceptFetch();
    await window.fetch("/some/api");
    expect(reported.length).toBe(1);
    expect(reported[0]!.errorType).toBe("api_5xx");
  });

  it("enqueue drops oldest when queue is full", async () => {
    const tracker = new ErrorTracker();
    vi.stubGlobal("navigator", { sendBeacon: () => false });
    vi.stubGlobal("fetch", async () => { throw new Error("offline"); });
    const payload = buildPayload({ source: "client", errorType: "js_exception", message: "x" });
    for (let i = 0; i < 21; i++) tracker.report({ ...payload, message: `msg ${i}` });
    await new Promise((r) => setTimeout(r, 0));
    const q = (tracker as unknown as { queue: unknown[] }).queue;
    expect(q.length).toBeLessThanOrEqual(20);
  });
});

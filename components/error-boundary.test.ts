/**
 * Unit tests for ErrorBoundary.
 *
 * Because vitest runs in `node` environment (no DOM / React Testing Library),
 * we test the class methods directly rather than mounting the component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock error-tracker before importing ErrorBoundary so the module uses our spy.
vi.mock("@/lib/error-tracker", () => {
  const report = vi.fn();
  const buildPayload = vi.fn((input: Record<string, unknown>) => ({ ...input }));
  return { errorTracker: { report }, buildPayload };
});

import { errorTracker, buildPayload } from "@/lib/error-tracker";
import { ErrorBoundary } from "./error-boundary";

const mockReport = vi.mocked(errorTracker.report);
const mockBuildPayload = vi.mocked(buildPayload);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ErrorBoundary.getDerivedStateFromError", () => {
  it("returns hasError: true", () => {
    const state = ErrorBoundary.getDerivedStateFromError(new Error("boom"));
    expect(state).toEqual({ hasError: true });
  });
});

describe("ErrorBoundary.componentDidCatch", () => {
  it("calls buildPayload with source=client and errorType=js_exception", () => {
    const instance = new ErrorBoundary({ children: null });
    const error = new Error("test error");
    error.stack = "Error: test error\n  at Foo\n  at Bar";

    const info: React.ErrorInfo = {
      componentStack: "\n  at Foo\n  at Bar",
    };

    instance.componentDidCatch(error, info);

    expect(mockBuildPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "client",
        errorType: "js_exception",
        message: "test error",
      })
    );
    expect(mockReport).toHaveBeenCalledTimes(1);
  });

  it("uses module prop as component when provided", () => {
    const instance = new ErrorBoundary({ children: null, module: "MyWidget" });
    const error = new Error("oops");

    instance.componentDidCatch(error, { componentStack: "\n  at SomeComp" });

    expect(mockBuildPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ component: "MyWidget" }),
      })
    );
  });

  it("falls back to componentStack when module prop is absent", () => {
    const instance = new ErrorBoundary({ children: null });
    const error = new Error("crash");

    instance.componentDidCatch(error, { componentStack: "\n  at DeepComponent\n  at App" });

    expect(mockBuildPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ component: "at DeepComponent" }),
      })
    );
  });

  it("uses 'unknown' when componentStack is empty and module is absent", () => {
    const instance = new ErrorBoundary({ children: null });
    instance.componentDidCatch(new Error("x"), { componentStack: "" });

    expect(mockBuildPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ component: "unknown" }),
      })
    );
  });
});

describe("ErrorBoundary.render", () => {
  it("returns children when no error", () => {
    const instance = new ErrorBoundary({ children: "child content" });
    // Default state: hasError = false
    const result = instance.render();
    expect(result).toBe("child content");
  });

  it("returns null when hasError and no fallback", () => {
    const instance = new ErrorBoundary({ children: "child" });
    instance.state = { hasError: true };
    const result = instance.render();
    expect(result).toBeNull();
  });

  it("returns fallback when hasError and fallback provided", () => {
    const instance = new ErrorBoundary({ children: "child", fallback: "error UI" });
    instance.state = { hasError: true };
    const result = instance.render();
    expect(result).toBe("error UI");
  });
});

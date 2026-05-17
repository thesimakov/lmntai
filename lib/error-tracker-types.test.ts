import { describe, it, expect } from "vitest";
import {
  ERROR_SOURCES,
  ERROR_TYPES,
  detectModule,
  type ErrorSource,
  type ErrorReportPayload,
} from "./error-tracker-types";

describe("ERROR_SOURCES", () => {
  it("contains client, server, ai", () => {
    expect(ERROR_SOURCES).toContain("client");
    expect(ERROR_SOURCES).toContain("server");
    expect(ERROR_SOURCES).toContain("ai");
  });
});

describe("ERROR_TYPES", () => {
  it("contains all expected types", () => {
    expect(ERROR_TYPES).toContain("js_exception");
    expect(ERROR_TYPES).toContain("unhandled_rejection");
    expect(ERROR_TYPES).toContain("api_5xx");
    expect(ERROR_TYPES).toContain("form_action");
    expect(ERROR_TYPES).toContain("ai_stream");
  });
});

describe("detectModule", () => {
  it("detects zero_block_editor before box_editor (prefix ordering)", () => {
    expect(detectModule("/playground/box/editor/zero?blockId=123")).toBe("zero_block_editor");
  });

  it("detects build_editor", () => {
    expect(detectModule("/playground/build")).toBe("build_editor");
  });

  it("detects box_editor from /playground/box", () => {
    expect(detectModule("/playground/box")).toBe("box_editor");
  });

  it("detects cms", () => {
    expect(detectModule("/playground/cms/some-page")).toBe("cms");
  });

  it("detects admin from nested path", () => {
    expect(detectModule("/admin/users")).toBe("admin");
  });

  it("detects auth from /login", () => {
    expect(detectModule("/login")).toBe("auth");
  });

  it("falls back to dashboard for unknown paths", () => {
    expect(detectModule("/billing/upgrade")).toBe("dashboard");
  });

  it("strips query string before matching", () => {
    expect(detectModule("/playground/build?projectId=123")).toBe("build_editor");
  });
});

describe("ErrorReportPayload shape", () => {
  it("accepts minimal payload", () => {
    const payload: ErrorReportPayload = {
      source: "client",
      errorType: "js_exception",
      message: "Something broke",
    };
    expect(payload.source).toBe("client");
  });
});

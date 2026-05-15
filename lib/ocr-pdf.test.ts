import { describe, it, expect, vi, afterEach } from "vitest";

describe("ocrPdfBuffer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when ANTHROPIC_API_KEY is not set", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const { ocrPdfBuffer } = await import("./ocr-pdf");
    const result = await ocrPdfBuffer(Buffer.from("fake"));
    expect(result).toBeNull();
  });

  it("returns null for buffers exceeding the 20 MB limit", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    const { ocrPdfBuffer } = await import("./ocr-pdf");
    const big = Buffer.alloc(21 * 1024 * 1024);
    const result = await ocrPdfBuffer(big);
    expect(result).toBeNull();
  });
});

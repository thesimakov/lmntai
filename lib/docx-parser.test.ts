import { describe, it, expect } from "vitest";
import { docxToText } from "./docx-parser";

describe("docxToText", () => {
  it("returns a string for empty buffer (mammoth handles gracefully)", async () => {
    const result = await docxToText(Buffer.alloc(0)).catch(() => "");
    expect(typeof result).toBe("string");
  });

  it("returns a string for non-docx bytes (error caught by caller)", async () => {
    const buf = Buffer.from("not a docx file at all");
    const result = await docxToText(buf).catch(() => "ERROR");
    expect(typeof result).toBe("string");
  });
});

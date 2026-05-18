import { describe, expect, it } from "vitest";
import { isPresentationSourceFile } from "./presentation-source-document-client";

describe("isPresentationSourceFile", () => {
  it("accepts docx by extension", () => {
    const file = new File([""], "deck.docx", {
      type: "application/octet-stream",
    });
    expect(isPresentationSourceFile(file)).toBe(true);
  });

  it("rejects unsupported types", () => {
    const file = new File([""], "image.png", { type: "image/png" });
    expect(isPresentationSourceFile(file)).toBe(false);
  });
});

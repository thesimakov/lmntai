import { describe, expect, it } from "vitest";

import { isLikelySandboxPreviewHtml } from "@/lib/sandbox-preview-html-detect";

describe("isLikelySandboxPreviewHtml", () => {
  it("reject plain markdown assistant wall", () => {
    expect(
      isLikelySandboxPreviewHtml("Привет! Я — **Builder**.\n\n**Лендинг** описание...")
    ).toBe(false);
  });

  it("accept minimal fragment with tag", () => {
    expect(isLikelySandboxPreviewHtml('<div class="x">hello</div>')).toBe(true);
  });

  it("accept doctype doc", () => {
    expect(
      isLikelySandboxPreviewHtml("<!DOCTYPE html><html lang=ru><body>Hi</body></html>")
    ).toBe(true);
  });
});

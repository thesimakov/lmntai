import { describe, expect, it } from "vitest";

import { isLovableFileFenceDelta, shouldCollapseAssistantCodeDump } from "./chat-artifact-ui";

describe("chat-artifact-ui", () => {
  it("detects Lovable fence line in delta", () => {
    expect(isLovableFileFenceDelta('```tsx:src/App.tsx\n')).toBe(true);
    expect(isLovableFileFenceDelta("plain text")).toBe(false);
  });

  it("collapses large fenced multi-file dumps", () => {
    const fence = "```tsx:src/main.tsx\nimport x from \"y\";\n```\n";
    expect(shouldCollapseAssistantCodeDump(fence.repeat(20))).toBe(true);
  });
});

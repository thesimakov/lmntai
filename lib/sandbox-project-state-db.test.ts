import { describe, expect, it } from "vitest";

import { mergeSandboxIndexHtml } from "./sandbox-project-state-db";

describe("mergeSandboxIndexHtml", () => {
  it("adds index.html from html when files lack it", () => {
    const files = mergeSandboxIndexHtml(
      { "slide_graph.json": "{}" },
      "<!DOCTYPE html><html><body>deck</body></html>"
    );
    expect(files["index.html"]).toContain("<!DOCTYPE html>");
    expect(files["slide_graph.json"]).toBe("{}");
  });

  it("keeps existing index.html when present", () => {
    const files = mergeSandboxIndexHtml(
      { "index.html": "<html>saved</html>" },
      "<html>other</html>"
    );
    expect(files["index.html"]).toBe("<html>saved</html>");
  });
});

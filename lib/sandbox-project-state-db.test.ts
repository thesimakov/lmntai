import { describe, expect, it } from "vitest";

import { mergeSandboxIndexHtml, resolveSandboxProjectFiles } from "./sandbox-project-state-db";

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

describe("resolveSandboxProjectFiles", () => {
  it("keeps marketing.json from DB when disk snapshot only has raw upload", () => {
    const report = '{"meta":{"companyName":"Acme"}}';
    const files = resolveSandboxProjectFiles(
      { "marketing.json": report, "marketing_raw.txt": "csv data" },
      { "marketing_raw.txt": "stale csv only" },
      ""
    );
    expect(files["marketing.json"]).toBe(report);
    expect(files["marketing_raw.txt"]).toBe("stale csv only");
  });
});

import { describe, expect, it } from "vitest";

import { findLovableEntry, parseLovableFencedFiles } from "./lovable-bundler";

describe("parseLovableFencedFiles", () => {
  it("parses tsx:path fences", () => {
    const raw = `Intro text

\`\`\`tsx:src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
createRoot(document.getElementById("root")!).render(<App />);
\`\`\`

\`\`\`tsx:src/App.tsx
export default function App() {
  return <div className="p-4">Hi</div>;
}
\`\`\`
`;
    const files = parseLovableFencedFiles(raw);
    expect(files).not.toBeNull();
    expect(files!["src/main.tsx"]).toContain("createRoot");
    expect(files!["src/App.tsx"]).toContain("App");
  });

  it("returns null for plain HTML", () => {
    expect(parseLovableFencedFiles("<!doctype html><html></html>")).toBeNull();
  });
});

describe("findLovableEntry", () => {
  it("prefers main.tsx", () => {
    expect(
      findLovableEntry({
        "src/main.tsx": "x",
        "src/App.tsx": "y"
      })
    ).toBe("src/main.tsx");
  });
});

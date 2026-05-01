import { describe, expect, it } from "vitest";

import { findLovableEntry, parseLovableFencedFiles, withLovableProjectScaffold } from "./lovable-bundler";

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

describe("withLovableProjectScaffold", () => {
  it("adds Vite scaffold files when output is partial", () => {
    const files = withLovableProjectScaffold({
      "src/App.tsx": "export default function App(){ return <div>Hello</div>; }"
    });
    expect(files["src/main.tsx"]).toContain("createRoot");
    expect(files["index.html"]).toContain('id="root"');
    expect(files["package.json"]).toContain('"vite"');
    expect(files["vite.config.ts"]).toContain("defineConfig");
    expect(files["tsconfig.json"]).toContain('"jsx": "react-jsx"');
    expect(files["src/index.css"]).toContain("box-sizing");
  });

  it("does not overwrite provided files", () => {
    const files = withLovableProjectScaffold({
      "src/main.tsx": "custom-main",
      "package.json": '{"name":"custom"}'
    });
    expect(files["src/main.tsx"]).toBe("custom-main");
    expect(files["package.json"]).toContain('"name":"custom"');
  });

  it("rewrites src root imports to project root fallback when needed", () => {
    const files = withLovableProjectScaffold({
      "src/main.tsx": `import App from "./App";`,
      "src/App.tsx": `import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
export default function App(){ return <><Header /><Hero /></>; }`,
      "components/Header.tsx": `export function Header(){ return <header>H</header>; }`,
      "components/Hero.tsx": `export function Hero(){ return <section>Hero</section>; }`
    });
    expect(files["src/App.tsx"]).toContain(`from "../components/Header"`);
    expect(files["src/App.tsx"]).toContain(`from "../components/Hero"`);
  });
});

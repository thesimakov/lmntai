/**
 * Lovable-режим: многофайловый React+TSX → один ESM-бандл (esbuild). Tailwind в превью — CDN.
 * Зависимости react / react-dom в package.json lemnity-builder.
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as esbuild from "esbuild";

const builderModuleDir = path.dirname(fileURLToPath(import.meta.url));
const builderRoot = path.join(builderModuleDir, "..");
const reqFromBuilderRoot = createRequire(path.join(builderRoot, "package.json"));

const PATH_IN_FENCE = /^[\w./\\-]+\.[a-z0-9]+$/i;

export function parseLovableFencedFiles(raw: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  const reColon = /```([a-z0-9]*):([^\n`]+)\n([\s\S]*?)```/gi;
  let m: RegExpExecArray | null;
  while ((m = reColon.exec(raw)) !== null) {
    const rel = normalizeProjectPath(m[2].trim());
    if (!PATH_IN_FENCE.test(rel)) continue;
    out[rel] = m[3].trimEnd();
  }
  if (Object.keys(out).length > 0) {
    return out;
  }

  const reFileComment = /```(?:tsx?|jsx?|css|json|html)?\s*\n\/\/\s*file:\s*([^\n]+)\n([\s\S]*?)```/gi;
  while ((m = reFileComment.exec(raw)) !== null) {
    const rel = normalizeProjectPath(m[1].trim());
    if (!PATH_IN_FENCE.test(rel)) continue;
    out[rel] = m[2].trimEnd();
  }

  return Object.keys(out).length > 0 ? out : null;
}

function normalizeProjectPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\//, "");
}

export function findLovableEntry(files: Record<string, string>): string | null {
  if (files["src/main.tsx"]) return "src/main.tsx";
  if (files["src/main.jsx"]) return "src/main.jsx";
  return null;
}

const DEFAULT_LOVABLE_PACKAGE_JSON = `{
  "name": "lemnity-lovable-app",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.1"
  }
}
`;

const DEFAULT_LOVABLE_INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lemnity App</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const DEFAULT_LOVABLE_MAIN_TSX = `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;

const DEFAULT_LOVABLE_APP_TSX = `export default function App() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl p-8">
      <h1 className="text-3xl font-bold tracking-tight">Lemnity App</h1>
      <p className="mt-3 text-base text-slate-600">Start editing src/App.tsx</p>
    </main>
  );
}
`;

const DEFAULT_LOVABLE_INDEX_CSS = `:root {
  font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
}
`;

const DEFAULT_LOVABLE_VITE_CONFIG = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()]
});
`;

const DEFAULT_LOVABLE_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;

const DEFAULT_LOVABLE_TSCONFIG_NODE = `{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
`;

const DEFAULT_LOVABLE_README = `# Lemnity Preview Project

Generated in Lovable-style mode.
`;

export function withLovableProjectScaffold(input: Record<string, string>): Record<string, string> {
  const files: Record<string, string> = { ...input };

  if (!files["src/main.tsx"] && !files["src/main.jsx"]) {
    files["src/main.tsx"] = DEFAULT_LOVABLE_MAIN_TSX;
  }
  if (!files["src/App.tsx"] && !files["src/App.jsx"]) {
    files["src/App.tsx"] = DEFAULT_LOVABLE_APP_TSX;
  }
  if (!files["src/index.css"] && !files["src/styles.css"]) {
    files["src/index.css"] = DEFAULT_LOVABLE_INDEX_CSS;
  }

  if (!files["index.html"]) files["index.html"] = DEFAULT_LOVABLE_INDEX_HTML;
  if (!files["package.json"]) files["package.json"] = DEFAULT_LOVABLE_PACKAGE_JSON;
  if (!files["vite.config.ts"] && !files["vite.config.js"]) files["vite.config.ts"] = DEFAULT_LOVABLE_VITE_CONFIG;
  if (!files["tsconfig.json"]) files["tsconfig.json"] = DEFAULT_LOVABLE_TSCONFIG;
  if (!files["tsconfig.node.json"]) files["tsconfig.node.json"] = DEFAULT_LOVABLE_TSCONFIG_NODE;
  if (!files["README.md"]) files["README.md"] = DEFAULT_LOVABLE_README;

  return files;
}

function resolveBareImportsFromBuilderRootPlugin(): esbuild.Plugin {
  return {
    name: "resolve-bare-from-builder-root",
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (args.namespace && args.namespace !== "file") {
          return undefined;
        }
        if (args.path.startsWith("node:") || args.path.startsWith("data:")) {
          return undefined;
        }
        if (args.path === "." || args.path.startsWith("./") || args.path.startsWith("../")) {
          return undefined;
        }
        if (path.isAbsolute(args.path)) {
          if (args.path.replace(/\\/g, "/").includes("node_modules")) {
            return { path: path.normalize(args.path) };
          }
          return undefined;
        }
        try {
          return { path: reqFromBuilderRoot.resolve(args.path) };
        } catch {
          return undefined;
        }
      });
    }
  };
}

function safeInlineModuleScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatEsbuildFailure(err: unknown): string {
  if (err && typeof err === "object" && "errors" in err) {
    const e = err as { errors: Array<{ text: string; location?: { file?: string; line?: number; column?: number } }> };
    if (Array.isArray(e.errors) && e.errors.length) {
      return e.errors
        .map((x) => {
          const l = x.location;
          const loc = l?.file
            ? ` ${l.file}${l.line != null ? `:${l.line}` : ""}${l.column != null ? `:${l.column}` : ""}`
            : "";
          return `${x.text || "Ошибка esbuild"}${loc}`;
        })
        .join("\n");
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

export function lovableBundleErrorHtml(detail: string): string {
  const safe = escapeHtmlText(detail.trim().slice(0, 4000));
  return [
    "<!DOCTYPE html>",
    '<html lang="ru">',
    "<head>",
    '  <meta charset="UTF-8" />',
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    "  <title>Не удалось собрать превью</title>",
    "  <style>",
    "    body { margin:0; font:15px/1.5 system-ui, sans-serif; background:#0a0a0a; color:#e5e5e5; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; box-sizing:border-box; }",
    "    .c { max-width:42rem; width:100%; border:1px solid #333; border-radius:12px; padding:20px; background:#141414; }",
    "    h1 { font-size:1.1rem; margin:0 0 8px; color:#fff; }",
    "    p { margin:0 0 12px; color:#a3a3a3; font-size:14px; }",
    "    pre { margin:0; padding:12px; border-radius:8px; background:#0a0a0a; color:#f5f5f5; font-size:12px; white-space:pre-wrap; word-break:break-word; overflow:auto; max-height:50vh; }",
    "  </style>",
    "</head>",
    "<body>",
    '  <div class="c">',
    "    <h1>Сборка превью не удалась</h1>",
    "    <p>Импортируйте только пакеты, которые есть в проекте Lemnity, либо попросите модель убрать лишние библиотеки. Код остаётся на вкладке «Код».</p>",
    "    <pre>",
    safe,
    "    </pre>",
    "  </div>",
    "</body>",
    "</html>"
  ].join("\n");
}

export type LovableBundleResult = { ok: true; html: string } | { ok: false; error: string };

export async function bundleLovableToPreviewHtml(inputFiles: Record<string, string>): Promise<LovableBundleResult> {
  const files = withLovableProjectScaffold(inputFiles);
  const entry = findLovableEntry(files);
  if (!entry) {
    return { ok: false, error: "Не найден entry (ожидается src/main.tsx или src/main.jsx)." };
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lovable-sbx-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, "utf8");
    }

    let result: esbuild.BuildResult;
    try {
      result = await esbuild.build({
        absWorkingDir: tmp,
        entryPoints: [entry],
        bundle: true,
        write: false,
        format: "esm",
        platform: "browser",
        target: "es2022",
        jsx: "automatic",
        logLevel: "silent",
        loader: { ".css": "empty" },
        nodePaths: [path.join(builderRoot, "node_modules")],
        plugins: [resolveBareImportsFromBuilderRootPlugin()]
      });
    } catch (err) {
      return { ok: false, error: formatEsbuildFailure(err) };
    }

    const file = result.outputFiles?.[0];
    if (!file?.text) {
      return { ok: false, error: "Пустой бандл (нет выхода esbuild)." };
    }

    const body = safeInlineModuleScript(file.text);

    return {
      ok: true,
      html: [
        "<!DOCTYPE html>",
        '<html lang="ru">',
        "<head>",
        '  <meta charset="UTF-8" />',
        '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
        "  <title>Lemnity · React</title>",
        '  <script src="https://cdn.tailwindcss.com"></script>',
        "</head>",
        "<body>",
        '  <div id="root"></div>',
        "  <script type=\"module\">",
        body,
        "  </script>",
        "</body>",
        "</html>"
      ].join("\n")
    };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

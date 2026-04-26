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

const require = createRequire(fileURLToPath(new URL("package.json", import.meta.url)));

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

function resolveFromApp(spec: string): string {
  return require.resolve(spec);
}

function bundleReactFromAppPlugin(): esbuild.Plugin {
  return {
    name: "bundle-react-from-lemnity-builder",
    setup(build) {
      const filter =
        /^(react|react\/jsx-runtime|react\/jsx-dev-runtime|react-dom|react-dom\/client|react-dom\/server)$/;

      build.onResolve({ filter }, (args) => ({
        path: resolveFromApp(args.path)
      }));
    }
  };
}

function safeInlineModuleScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

export async function bundleLovableToPreviewHtml(files: Record<string, string>): Promise<string | null> {
  const entry = findLovableEntry(files);
  if (!entry) return null;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lovable-sbx-"));
  try {
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(tmp, rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content, "utf8");
    }

    const result = await esbuild.build({
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
      plugins: [bundleReactFromAppPlugin()]
    });

    const file = result.outputFiles?.[0];
    if (!file?.text) return null;

    const body = safeInlineModuleScript(file.text);

    return [
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
    ].join("\n");
  } catch {
    return null;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

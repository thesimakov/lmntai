import type { LemnityBoxCanvasContent } from "@/lib/lemnity-box-editor-schema";

function escapeHtmlAttr(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

/** Сборка полного `index.html` для записи в песочницу из снимка GrapesJS. */
export function buildLemnityBoxIndexHtml(
  content: LemnityBoxCanvasContent,
  options?: { title?: string }
): string {
  const title = (options?.title ?? "Lemnity Box").trim() || "Lemnity Box";
  const { html, css } = content;
  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtmlAttr(title)}</title>
<style>
${css}
</style>
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Плейсхолдеры «HTML-секции» в экспорте GrapesJS: тело хранится в data-ln-raw (base64 UTF-8).
 * Перед выдачей страницы (превью, публикация) заменяем узлы на расшифрованную разметку.
 */

/** Порядок атрибутов на разметке GrapesJS может отличаться — проверяем оба через lookahead. */
const EMBED_PATTERN =
  /<div\b(?=[^>]*\bdata-ln-html-embed\s*=\s*["']?1["']?)(?=[^>]*\bdata-ln-raw\s*=\s*["']([^"']+)["'])[^>]*>\s*<\/div>/gi;

/** UTF-8 → base64 (браузер и Node). */
export function encodeLnHtmlSnippetUtf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  if (typeof btoa === "function") return btoa(bin);
  return Buffer.from(bytes).toString("base64");
}

/** Base64 → UTF-8 строка. */
export function decodeLnHtmlSnippetUtf8(b64: string): string {
  const trimmed = b64.trim();
  if (!trimmed) return "";
  try {
    let bin: string;
    if (typeof atob === "function") {
      bin = atob(trimmed);
    } else {
      bin = Buffer.from(trimmed, "base64").toString("binary");
    }
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

/** Редакторская подсказка над HTML-секцией — не попадает на опубликованную страницу. */
const EDITOR_HINT_PATTERN =
  /<div\b[^>]*\bdata-ln-editor-hint\s*=\s*["']?1["']?[^>]*>[\s\S]*?<\/div>/gi;

export function stripLemnityHtmlSectionEditorHints(html: string): string {
  if (!html.includes("data-ln-editor-hint")) return html;
  return html.replace(EDITOR_HINT_PATTERN, "");
}

/** Готовит фрагмент body GrapesJS к превью/публикации: убирает редакторские подсказки и разворачивает embed. */
export function prepareLemnityBoxBodyHtmlForPublish(html: string): string {
  return expandLemnityHtmlEmbeds(stripLemnityHtmlSectionEditorHints(html));
}

export function expandLemnityHtmlEmbeds(html: string): string {
  if (!html.includes("data-ln-html-embed")) return html;
  return html.replace(EMBED_PATTERN, (_full, b64: string) => decodeLnHtmlSnippetUtf8(String(b64)));
}

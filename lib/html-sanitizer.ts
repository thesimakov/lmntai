import sanitizeHtml from "sanitize-html";

/**
 * Санитизирует HTML от пользователя (GrapesJS/box editor) перед сохранением в базу.
 * Сохраняет layout/design контент, вырезает XSS-векторы.
 *
 * Включается через ENABLE_HTML_SANITIZATION=true.
 * По умолчанию выключен для поэтапного тестирования с реальными проектами.
 */
export function sanitizeSandboxHtml(html: string): string {
  if (process.env.ENABLE_HTML_SANITIZATION !== "true") return html;
  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "video",
      "source",
      "iframe",
      "figure",
      "figcaption",
      "section",
      "article",
      "header",
      "footer",
      "main",
      "nav",
      "aside",
      "svg",
      "path",
      "circle",
      "rect",
      "line",
      "polyline",
      "polygon",
      "style",
      "link",
    ]),
    allowedAttributes: {
      "*": ["style", "class", "id", "data-*", "aria-*", "role", "tabindex"],
      a: ["href", "target", "rel", "name"],
      img: ["src", "alt", "width", "height", "loading", "decoding"],
      iframe: ["src", "width", "height", "frameborder", "allowfullscreen", "allow"],
      video: ["src", "autoplay", "muted", "loop", "controls", "playsinline", "width", "height"],
      source: ["src", "type"],
      link: ["rel", "href", "type"],
      svg: ["xmlns", "viewBox", "width", "height", "fill", "stroke", "stroke-width"],
      path: ["d", "fill", "stroke", "stroke-width", "fill-rule"],
      circle: ["cx", "cy", "r", "fill", "stroke"],
      rect: ["x", "y", "width", "height", "rx", "ry", "fill", "stroke"],
    },
    allowedSchemes: ["https", "http", "data", "blob"],
    allowedSchemesByTag: {
      img: ["https", "http", "data", "blob"],
      a: ["https", "http", "mailto", "tel"],
      iframe: ["https", "http"],
    },
    // Сохраняем <style> теги целиком (используются GrapesJS для инлайн CSS)
    allowedStyles: {
      "*": {
        // Разрешаем любые CSS-свойства через wildcard (только inline style)
      },
    },
  });
}

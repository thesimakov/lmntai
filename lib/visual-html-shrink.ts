/** Огромные data:-URL во вложении делают PATCH непроходящим через nginx или неудобными для Postgres. */

const TRANSPARENT_PIXEL_GIF =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/** Макс. длина одного значения атрибута с data:, после которого подставляем лёгкий placeholder. Символы (не байты). */
export const VISUAL_SAVE_MAX_INLINE_DATA_CHARS = parseInt(process.env.VISUAL_SAVE_MAX_INLINE_DATA_CHARS ?? "450000", 10);

/** Сжимаем огромные data: во всех элементов — мутирует дерево документа. Возвращает true, если что-то заменили. */
export function shrinkHeavyInlineAssetsInDocument(doc: Document, maxChars = VISUAL_SAVE_MAX_INLINE_DATA_CHARS): boolean {
  if (!(doc.body || doc.documentElement)) return false;
  let touched = false;
  doc.querySelectorAll("*").forEach((el) => {
    el.getAttributeNames().forEach((name) => {
      const raw = el.getAttribute(name);
      if (raw == null) return;
      const lc = name.toLowerCase();
      if (lc === "style") {
        const next = shrinkDataUrlsInStyleAttribute(raw, maxChars);
        if (next !== raw) {
          el.setAttribute(name, next);
          touched = true;
        }
        return;
      }
      if (lc === "srcset") {
        if (raw.length > maxChars && /\bdata:image\//i.test(raw)) {
          el.removeAttribute("srcset");
          touched = true;
        }
        return;
      }
      if (raw.length <= maxChars || !looksLikeHugeImageDataUrl(raw)) return;
      if (lc === "href" || lc === "xlink:href") {
        const isSvgImageLink =
          el.namespaceURI === "http://www.w3.org/2000/svg" && el.localName === "image";
        if (!isSvgImageLink) return;
      } else if (lc !== "src" && lc !== "poster") {
        return;
      }
      el.setAttribute(name, TRANSPARENT_PIXEL_GIF);
      el.setAttribute("data-lmnt-shrink-inline", "");
      touched = true;
    });
  });
  return touched;
}

/** Замещаем только тяжёлые инлайновые data:image, не любые data: (скрипт, pdf в ссылке). */
function looksLikeHugeImageDataUrl(s: string): boolean {
  return /^data:image\//i.test(s);
}

/** Сокращаем только css url(data:image/…) — пропускаем уже короткие. */
export function shrinkDataUrlsInStyleAttribute(css: string, maxChars: number): string {
  if (css.length <= maxChars || !css.includes("data:")) return css;
  return css.replace(
    /url\(\s*(["']?)((?:data:image\/(?:[^)\\]|\\.))+)\1?\s*\)/gi,
    (full, quote, dataPart: string) => {
      if (typeof dataPart !== "string" || dataPart.length <= maxChars) return full;
      const q = typeof quote === "string" ? quote : "";
      return `url(${q}${TRANSPARENT_PIXEL_GIF}${q})`;
    }
  );
}

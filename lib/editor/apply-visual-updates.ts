import {
  resolveRasterHtmlImg,
  resolveSvgRasterImage,
  type LayoutElementKind
} from "@/lib/editor/layout-element";

/** Привести значение к допустимой строке размера для CSS (font-size / width / height). */
function normalizeCssSize(val: string): string {
  const v = val.trim();
  if (!v) return "";
  if (/^-?\d+(\.\d+)?(px|rem|em|%|vh|vw|svh|svw)$/.test(v)) return v;
  if (/^-?\d+(\.\d+)?$/.test(v)) return `${v}px`;
  return v;
}

/** Поле «фон»: пользователь может ввести URL или полное `url(...)`. */
function normalizeBackgroundImageInput(val: string): string {
  const v = val.trim();
  if (!v) return "";
  const m = v.match(/^url\s*\(\s*["']?([^"')]+)["']?\s*\)$/i);
  return (m ? m[1] : v).trim();
}

const VISUAL_EDITOR_ICON_ATTR = "data-ve-icon";

function isInputButtonLike(el: Element): boolean {
  if (el.tagName !== "INPUT") return false;
  const t = ((el as HTMLInputElement).type || "text").toLowerCase();
  return t === "button" || t === "submit" || t === "reset";
}

/** `<button>`, `<a>` или элемент с `role="button"` (холст для leading-icon), не `<input>`. */
function canHostInlineButtonIcon(el: Element): boolean {
  const tag = el.tagName.toUpperCase();
  if (tag === "INPUT") return false;
  return tag === "BUTTON" || tag === "A" || el.getAttribute("role") === "button";
}

function removeVisualEditorIconNodes(el: Element): void {
  el.querySelectorAll(`[${VISUAL_EDITOR_ICON_ATTR}]`).forEach((n) => n.remove());
}

/** Экранирование для `url("...")` в mask-image (iframe-safe абсолютный URL). */
function maskUrlForCss(doc: Document, src: string): string {
  let href = src.trim();
  try {
    href = new URL(src, doc.baseURI || doc.documentURI || "http://localhost").href;
  } catch {
    /* оставляем как есть */
  }
  return href.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function leadIconTintFromEl(el: Element): string {
  return el.getAttribute("data-icon-color")?.trim() || "currentColor";
}

/**
 * Ведущая иконка: mask по SVG + background-color (tint). Отступ до текста — 8px.
 */
function upsertVisualEditorIconNode(el: Element, src: string): void {
  if (!canHostInlineButtonIcon(el)) return;
  const doc = el.ownerDocument;
  removeVisualEditorIconNodes(el);
  const url = maskUrlForCss(doc, src);
  const span = doc.createElement("span");
  span.setAttribute(VISUAL_EDITOR_ICON_ATTR, "");
  span.setAttribute("aria-hidden", "true");
  span.style.display = "inline-block";
  span.style.width = "1rem";
  span.style.height = "1rem";
  span.style.flexShrink = "0";
  span.style.verticalAlign = "middle";
  span.style.marginInlineEnd = "8px";
  span.style.backgroundColor = leadIconTintFromEl(el);
  span.style.setProperty("mask-image", `url("${url}")`);
  span.style.setProperty("mask-size", "contain");
  span.style.setProperty("mask-position", "center");
  span.style.setProperty("mask-repeat", "no-repeat");
  span.style.setProperty("-webkit-mask-image", `url("${url}")`);
  span.style.setProperty("-webkit-mask-size", "contain");
  span.style.setProperty("-webkit-mask-position", "center");
  span.style.setProperty("-webkit-mask-repeat", "no-repeat");
  span.style.pointerEvents = "none";
  span.style.userSelect = "none";
  el.insertBefore(span, el.firstChild);
}

/** Заменить подпись кнопки/ссылки, не трогая узел `data-ve-icon`. */
function setTextPreservingVisualIcon(el: Element, val: string): void {
  const icon = el.querySelector(`[${VISUAL_EDITOR_ICON_ATTR}]`);
  const frag = el.ownerDocument.createDocumentFragment();
  if (icon) frag.appendChild(icon);
  if (val) frag.appendChild(el.ownerDocument.createTextNode(val));
  el.textContent = "";
  while (frag.firstChild) {
    el.appendChild(frag.firstChild);
  }
}

/** Узел картинки в превью (HTML `<img>` или обёртки с одним разрешённым img). */
export function rasterImageTarget(el: Element): HTMLImageElement | null {
  return resolveRasterHtmlImg(el);
}

/**
 * Применяет поля из визуального редактора к узлу превью (iframe).
 * Не использует `instanceof`, чтобы работать с элементами из другого realm.
 */
export function applyVisualUpdatesToElement(
  el: Element,
  _elementType: LayoutElementKind | string,
  updates: { field: string; new_value: string }[]
): void {
  const html = el as HTMLElement;
  const htmlImg = resolveRasterHtmlImg(el);
  const svgImg = resolveSvgRasterImage(el);

  for (const u of updates) {
    const val = u.new_value;
    switch (u.field) {
      case "text":
        if (isInputButtonLike(el)) {
          (el as HTMLInputElement).value = val;
        } else if (canHostInlineButtonIcon(el)) {
          setTextPreservingVisualIcon(el, val);
        } else {
          el.textContent = val;
        }
        break;
      case "color":
        html.style.color = val;
        break;
      case "size":
        html.style.fontSize = normalizeCssSize(val);
        break;
      case "alignment":
        html.style.textAlign = val;
        break;
      case "href":
        if (el.tagName === "A") {
          (el as HTMLAnchorElement).href = val;
        }
        break;
      case "icon": {
        const trimmed = val.trim();
        if (trimmed) {
          el.setAttribute("data-icon", trimmed);
          upsertVisualEditorIconNode(el, trimmed);
        } else {
          el.removeAttribute("data-icon");
          el.removeAttribute("data-icon-color");
          removeVisualEditorIconNodes(el);
        }
        break;
      }
      case "iconColor":
        if (val.trim()) el.setAttribute("data-icon-color", val.trim());
        else el.removeAttribute("data-icon-color");
        break;
      case "variant":
        if (val.trim()) el.setAttribute("data-variant", val.trim());
        else el.removeAttribute("data-variant");
        break;
      case "src":
        if (htmlImg) htmlImg.src = val;
        else if (svgImg) {
          svgImg.setAttribute("href", val);
          svgImg.setAttributeNS("http://www.w3.org/1999/xlink", "href", val);
        }
        break;
      case "alt":
        if (htmlImg) htmlImg.alt = val;
        else if (svgImg) {
          if (val.trim()) svgImg.setAttribute("aria-label", val.trim());
          else svgImg.removeAttribute("aria-label");
        }
        break;
      case "width": {
        const s = normalizeCssSize(val);
        const styleTarget = htmlImg ?? svgImg ?? html;
        if (htmlImg) {
          if (val.trim() && /^\d+$/.test(val.trim())) htmlImg.setAttribute("width", val.trim());
          else htmlImg.removeAttribute("width");
        } else if (svgImg) {
          if (val.trim()) svgImg.setAttribute("width", val.trim());
          else svgImg.removeAttribute("width");
        }
        styleTarget.style.width = s || "";
        break;
      }
      case "height": {
        const s = normalizeCssSize(val);
        const styleTarget = htmlImg ?? svgImg ?? html;
        if (htmlImg) {
          if (val.trim() && /^\d+$/.test(val.trim())) htmlImg.setAttribute("height", val.trim());
          else htmlImg.removeAttribute("height");
        } else if (svgImg) {
          if (val.trim()) svgImg.setAttribute("height", val.trim());
          else svgImg.removeAttribute("height");
        }
        styleTarget.style.height = s || "";
        break;
      }
      case "borderRadius":
        (htmlImg ?? svgImg ?? html).style.borderRadius = normalizeCssSize(val);
        break;
      case "backgroundImage": {
        const url = normalizeBackgroundImageInput(val);
        if (url) {
          const safe = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
          html.style.backgroundImage = `url("${safe}")`;
        } else {
          html.style.backgroundImage = "";
        }
        break;
      }
      default:
        break;
    }
  }

  if (canHostInlineButtonIcon(el) && el.getAttribute("data-icon")?.trim()) {
    const node = el.querySelector(`[${VISUAL_EDITOR_ICON_ATTR}]`) as HTMLElement | null;
    if (node) {
      const c = el.getAttribute("data-icon-color")?.trim();
      node.style.backgroundColor = c || "currentColor";
    }
  }
}

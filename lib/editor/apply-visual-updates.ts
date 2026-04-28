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
        el.textContent = val;
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
      case "icon":
        if (val.trim()) el.setAttribute("data-icon", val.trim());
        else el.removeAttribute("data-icon");
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
}

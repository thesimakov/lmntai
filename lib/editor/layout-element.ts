/**
 * Сопоставление DOM узла превью с типом элемента макета и полями формы редактора.
 * При наличии в разметке data-lmnt-* агент может задавать стабильные id и путь.
 */

export const LMNT_ATTR_ELEMENT_ID = "data-lmnt-element-id";
export const LMNT_ATTR_ELEMENT_TYPE = "data-lmnt-element-type";
export const LMNT_ATTR_LAYOUT_PATH = "data-lmnt-layout-path";

export type LayoutElementKind = "text" | "image" | "button" | "link" | "icon" | "container";

export type LayoutElementSnapshot = {
  elementId: string;
  elementType: LayoutElementKind;
  layoutPath: string;
  tagName: string;
  propsPreview: Record<string, string>;
  initialFields: Record<string, string>;
};

const TEXT_LIKE = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "SPAN",
  "LABEL",
  "STRONG",
  "EM",
  "B",
  "I",
  "SMALL",
  "CODE",
  "TIME",
  "MARK"
]);

const SVG_NS = "http://www.w3.org/2000/svg";

/** Растровый `<image>` внутри SVG (не HTML `<img>`). */
export function resolveSvgRasterImage(el: Element): SVGImageElement | null {
  if (el.namespaceURI !== SVG_NS) return null;
  if (el.tagName.toLowerCase() !== "image") return null;
  return el as unknown as SVGImageElement;
}

/**
 * HTML-картинка для редактора: сам `<img>`, `<picture>`, `<figure>`, блок с единственным прямым `<img>` среди дочерних элементов.
 */
export function resolveRasterHtmlImg(el: Element): HTMLImageElement | null {
  if (el.tagName === "IMG") return el as HTMLImageElement;
  if (el.tagName === "PICTURE") {
    const im = el.querySelector("img");
    return im ? (im as HTMLImageElement) : null;
  }
  if (el.tagName === "FIGURE") {
    const im = el.querySelector("img");
    return im ? (im as HTMLImageElement) : null;
  }
  const tag = el.tagName.toUpperCase();
  if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE") {
    const direct = el.querySelectorAll(":scope > img");
    if (direct.length === 1) return direct[0] as HTMLImageElement;
  }
  return null;
}

function hashDomPath(el: Element): string {
  let path = "";
  let n: Element | null = el;
  let depth = 0;
  while (n && n.tagName !== "BODY" && depth++ < 14) {
    const parent: Element | null = n.parentElement;
    const idx = parent ? Array.prototype.indexOf.call(parent.children, n) : 0;
    path = `${n.tagName}:${idx}|${path}`;
    n = parent;
  }
  let h = 2166136261;
  for (let i = 0; i < path.length; i++) {
    h ^= path.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0).toString(36).slice(0, 10);
}

export function computeElementId(el: Element): string {
  const explicit = el.getAttribute(LMNT_ATTR_ELEMENT_ID)?.trim();
  if (explicit) return explicit;
  const hid = (el as HTMLElement).id?.trim();
  if (hid) return hid;
  return `${el.tagName.toLowerCase()}_${hashDomPath(el)}`;
}

export function computeLayoutPath(el: Element, root: Element | Document): string {
  const explicit = el.getAttribute(LMNT_ATTR_LAYOUT_PATH)?.trim();
  if (explicit) return explicit;

  const stop: Element | null =
    root.nodeType === Node.DOCUMENT_NODE
      ? (root as Document).body
      : root.nodeType === Node.ELEMENT_NODE
        ? (root as Element)
        : document.body;
  const parts: string[] = [];
  let cur: Element | null = el;
  let guard = 0;
  while (cur && cur !== stop && guard++ < 16) {
    const segPath = cur.getAttribute(LMNT_ATTR_LAYOUT_PATH)?.trim();
    if (segPath) {
      parts.unshift(segPath);
      break;
    }
    let seg = cur.tagName.toLowerCase();
    const pid = (cur as HTMLElement).id?.trim();
    if (pid) seg = `${seg}#${pid}`;
    parts.unshift(seg);
    cur = cur.parentElement;
  }
  if (parts.length === 0) return `Page / ${el.tagName.toLowerCase()}`;
  const joined = parts.join(" / ");
  if (/^page(\s|\/|$)/i.test(joined)) return joined;
  return `Page / ${joined}`;
}

function inferKind(el: Element): LayoutElementKind {
  const fromAttr = el.getAttribute(LMNT_ATTR_ELEMENT_TYPE)?.trim().toLowerCase();
  if (
    fromAttr === "text" ||
    fromAttr === "image" ||
    fromAttr === "button" ||
    fromAttr === "link" ||
    fromAttr === "icon" ||
    fromAttr === "container"
  ) {
    return fromAttr;
  }
  if (resolveSvgRasterImage(el)) return "image";
  if (resolveRasterHtmlImg(el)) return "image";
  const tag = el.tagName.toUpperCase();
  if (tag === "BUTTON") return "button";
  if (tag === "A") return "link";
  if (tag === "SVG" || el.closest("svg")) return "icon";
  if (TEXT_LIKE.has(tag)) return "text";
  if (tag === "DIV" || tag === "SECTION" || tag === "ARTICLE" || tag === "HEADER" || tag === "FOOTER" || tag === "NAV" || tag === "MAIN" || tag === "ASIDE") {
    const t = el.textContent?.trim();
    if (t && t.length > 0 && t.length < 800 && !el.querySelector("img,video,iframe,svg")) return "text";
    return "container";
  }
  return "container";
}

function pxReadable(px: string): string {
  const m = px.match(/^([\d.]+)px$/);
  return m ? String(Number(m[1])) : px;
}

/** DIV / SECTION и т.п. — можно задать фон-блоком в редакторе. */
function isBlockishForBackground(el: Element): boolean {
  const tag = el.tagName.toUpperCase();
  return (
    tag === "DIV" ||
    tag === "SECTION" ||
    tag === "ARTICLE" ||
    tag === "HEADER" ||
    tag === "FOOTER" ||
    tag === "NAV" ||
    tag === "MAIN" ||
    tag === "ASIDE" ||
    tag === "LI"
  );
}

/** Извлекает URL из `url("...")` / `url(...)`. */
export function extractUrlFromCssBackground(css: string): string {
  const m = css.trim().match(/url\s*\(\s*["']?([^"')]+)["']?\s*\)/i);
  return m ? m[1].trim() : "";
}

function readBackgroundImageUrl(el: Element): string {
  const html = el as HTMLElement;
  const inline = html.style.backgroundImage?.trim();
  if (inline && inline !== "none") {
    const u = extractUrlFromCssBackground(inline);
    if (u) return u;
  }
  const cs = html.ownerDocument.defaultView?.getComputedStyle(html);
  const bi = cs?.backgroundImage?.trim();
  if (!bi || bi === "none") return "";
  return extractUrlFromCssBackground(bi);
}

/** Подпись для overlay и шапки панели: «Link · el_1342» + путь макета. */
export function formatOverlayLabel(el: Element): { primary: string; secondary: string } {
  const snap = buildLayoutSnapshot(el);
  if (!snap) {
    return { primary: el.tagName.toLowerCase(), secondary: "" };
  }
  const typeTitle = snap.elementType.charAt(0).toUpperCase() + snap.elementType.slice(1);
  const primary = `${typeTitle} · ${snap.elementId}`;
  const secondary =
    snap.layoutPath.length > 64 ? `${snap.layoutPath.slice(0, 61)}…` : snap.layoutPath;
  return { primary, secondary };
}

export function buildLayoutSnapshot(el: Element): LayoutElementSnapshot | null {
  if (el.nodeType !== Node.ELEMENT_NODE) return null;
  const elementId = computeElementId(el);
  const elementType = inferKind(el);
  const layoutPath = computeLayoutPath(el, el.ownerDocument?.body ?? document.body);
  const tagName = el.tagName.toLowerCase();

  const propsPreview: Record<string, string> = { tag: tagName };
  const initialFields: Record<string, string> = {};

  const svgRaster = resolveSvgRasterImage(el);
  const rasterHtml = resolveRasterHtmlImg(el);

  if (svgRaster) {
    initialFields.src =
      svgRaster.getAttribute("href") ||
      svgRaster.getAttributeNS("http://www.w3.org/1999/xlink", "href") ||
      "";
    initialFields.alt = svgRaster.getAttribute("aria-label")?.trim() ?? "";
    initialFields.width = svgRaster.getAttribute("width") ?? "";
    initialFields.height = svgRaster.getAttribute("height") ?? "";
    const cs = svgRaster.ownerDocument.defaultView?.getComputedStyle(svgRaster);
    initialFields.borderRadius = cs?.borderRadius ? pxReadable(cs.borderRadius) : "";
    propsPreview.src = initialFields.src.slice(0, 120);
    propsPreview.alt = initialFields.alt;
  } else if (rasterHtml) {
    const img = rasterHtml;
    initialFields.src = img.currentSrc || img.src || img.getAttribute("src") || "";
    initialFields.alt = img.alt ?? "";
    const w = img.getAttribute("width") ?? "";
    const h = img.getAttribute("height") ?? "";
    initialFields.width = w || "";
    initialFields.height = h || "";
    const cs = img.ownerDocument.defaultView?.getComputedStyle(img);
    initialFields.borderRadius = cs?.borderRadius ? pxReadable(cs.borderRadius) : "";
    propsPreview.src = initialFields.src.slice(0, 120);
    propsPreview.alt = initialFields.alt;
  } else if (el.tagName === "A") {
    const a = el as HTMLAnchorElement;
    initialFields.text = el.textContent?.trim().replace(/\s+/g, " ") ?? "";
    initialFields.href = a.href || el.getAttribute("href") || "";
    initialFields.icon = el.getAttribute("data-icon")?.trim() ?? "";
    propsPreview.href = initialFields.href;
    propsPreview.text = initialFields.text.slice(0, 120);
  } else if (el.tagName === "BUTTON" || elementType === "button") {
    initialFields.text = el.textContent?.trim().replace(/\s+/g, " ") ?? "";
    initialFields.icon = el.getAttribute("data-icon")?.trim() ?? "";
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    initialFields.color = cs?.color ?? "";
    initialFields.variant =
      el.getAttribute("data-variant")?.trim() ||
      (el.className.includes("outline") ? "outline" : el.className.includes("ghost") ? "ghost" : "default");
    propsPreview.text = initialFields.text.slice(0, 120);
    propsPreview.icon = initialFields.icon;
  } else if (elementType === "icon") {
    initialFields.icon = el.getAttribute("data-icon")?.trim() ?? "";
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    initialFields.color = cs?.color ?? "";
    propsPreview.icon = initialFields.icon;
  } else if (elementType === "text" || TEXT_LIKE.has(el.tagName)) {
    initialFields.text = el.textContent?.trim().replace(/\s+/g, " ") ?? "";
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    initialFields.color = cs?.color ?? "";
    initialFields.size = cs?.fontSize ? pxReadable(cs.fontSize) : "";
    initialFields.alignment = (cs?.textAlign as string) || "left";
    propsPreview.text = initialFields.text.slice(0, 160);
    if (isBlockishForBackground(el)) {
      initialFields.backgroundImage = readBackgroundImageUrl(el);
      propsPreview.backgroundImage = initialFields.backgroundImage.slice(0, 80);
    }
  } else {
    initialFields.text = el.textContent?.trim().replace(/\s+/g, " ") ?? "";
    const cs = el.ownerDocument.defaultView?.getComputedStyle(el);
    initialFields.color = cs?.color ?? "";
    initialFields.size = cs?.fontSize ? pxReadable(cs.fontSize) : "";
    initialFields.alignment = (cs?.textAlign as string) || "left";
    initialFields.backgroundImage = readBackgroundImageUrl(el);
    propsPreview.note = "container";
    propsPreview.backgroundImage = initialFields.backgroundImage.slice(0, 80);
  }

  return {
    elementId,
    elementType,
    layoutPath,
    tagName,
    propsPreview,
    initialFields
  };
}

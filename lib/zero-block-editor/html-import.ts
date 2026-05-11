import type { ZbElement, ZbTextProps, ZbImageProps, ZbShapeProps, ZbButtonProps, ZbResponsiveOverride, ZbBreakpoint, ZbAnimationConfig } from "./types";
import { zbNewId } from "./defaults";

function parsePx(val: string | null | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return Number.isFinite(n) ? n : 0;
}

function parseRotate(transform: string): number {
  const m = transform.match(/rotate\(([-\d.]+)deg\)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseOpacity(opacity: string): number {
  const n = parseFloat(opacity);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

function decodeResponsive(raw: string | null): ZbElement["responsive"] {
  if (!raw) return {};
  try {
    const result: Partial<Record<ZbBreakpoint, ZbResponsiveOverride>> = {};
    for (const part of raw.split("|")) {
      const colonIdx = part.indexOf(":");
      if (colonIdx === -1) continue;
      const bp = part.slice(0, colonIdx) as ZbBreakpoint;
      const ov = JSON.parse(part.slice(colonIdx + 1)) as ZbResponsiveOverride;
      result[bp] = ov;
    }
    return result;
  } catch {
    return {};
  }
}

function elementFromAbsolute(el: HTMLElement, index: number): ZbElement {
  const s = el.style;
  const x = parsePx(s.left);
  const y = parsePx(s.top);
  const w = parsePx(s.width) || 100;
  const h = parsePx(s.height) || 40;
  const rot = parseRotate(s.transform || "");
  const opacity = parseOpacity(s.opacity || "1");
  const zIndex = parseInt(s.zIndex || String(index + 1), 10) || index + 1;
  const id = el.getAttribute("data-zb-id") || zbNewId();

  // Restore persisted metadata if present (set by html-export.ts)
  const locked = el.getAttribute("data-zb-locked") === "1";
  const responsive = decodeResponsive(el.getAttribute("data-zb-responsive"));
  let animation: ZbElement["animation"] = null;
  try {
    const rawAnim = el.getAttribute("data-zb-anim");
    if (rawAnim) animation = JSON.parse(rawAnim) as ZbAnimationConfig;
  } catch { /* ignore */ }
  const name = el.getAttribute("data-zb-name") || undefined;
  const typeHint = el.getAttribute("data-zb-type") as ZbElement["type"] | null;

  const firstChild = el.firstElementChild as HTMLElement | null;

  const meta = { locked, responsive, animation };

  // Image check
  const img = el.querySelector("img");
  if (img && !el.querySelector("button, a[href]") && !(el.textContent?.trim() && !img)) {
    const props: ZbImageProps = {
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
      objectFit: (img.style.objectFit as "cover" | "contain") || "cover",
      borderRadius: parsePx(img.style.borderRadius),
      lazyLoad: img.getAttribute("loading") === "lazy",
    };
    return { id, type: "image", x, y, w, h, rot, opacity, zIndex, visible: true, name: name ?? "Изображение", props: props as unknown as Record<string, unknown>, ...meta };
  }

  // Button / link check
  const btnEl = firstChild && (firstChild.tagName === "BUTTON" || (firstChild.tagName === "A" && firstChild.children.length === 0));
  if (btnEl) {
    const a = firstChild as HTMLAnchorElement & HTMLButtonElement;
    const props: ZbButtonProps = {
      text: a.textContent?.trim() || "Кнопка",
      link: a.href || a.getAttribute("href") || "#",
      targetBlank: a.target === "_blank",
      backgroundColor: a.style.background || a.style.backgroundColor || "#f26b4f",
      textColor: a.style.color || "#ffffff",
      borderRadius: parsePx(a.style.borderRadius),
      fontSize: parsePx(a.style.fontSize) || 16,
      fontWeight: parseInt(a.style.fontWeight || "600", 10),
      action: "link" as const,
    };
    return { id, type: "button", x, y, w, h, rot, opacity, zIndex, visible: true, name: name ?? "Кнопка", props: props as unknown as Record<string, unknown>, ...meta };
  }

  // Shape check: inner div with background, no text content
  if (typeHint === "shape" || (firstChild && !firstChild.textContent?.trim() && !firstChild.querySelector("img, a, button"))) {
    const bg = firstChild?.style.background || firstChild?.style.backgroundColor;
    if (bg || typeHint === "shape") {
      const br = parsePx(firstChild?.style.borderRadius);
      const isCircle = firstChild?.style.borderRadius === "50%";
      const props: ZbShapeProps = {
        shapeType: isCircle ? "circle" : "rectangle",
        fill: bg ?? "#e2e8f0",
        borderRadius: isCircle ? 0 : br,
      };
      return { id, type: "shape", x, y, w, h, rot, opacity, zIndex, visible: true, name: name ?? "Фигура", props: props as unknown as Record<string, unknown>, ...meta };
    }
  }

  // Element with background but no children text: treat as shape
  const ownBg = s.background || s.backgroundColor;
  if (ownBg && !el.querySelector("img, button, a[href]") && !el.textContent?.trim()) {
    const props: ZbShapeProps = {
      shapeType: "rectangle",
      fill: ownBg,
      borderRadius: parsePx(s.borderRadius),
    };
    return { id, type: "shape", x, y, w, h, rot, opacity, zIndex, visible: true, name: name ?? "Фигура", props: props as unknown as Record<string, unknown>, ...meta };
  }

  // Text check: has text content, no block images
  const textContent = el.textContent?.trim() || "";
  if (textContent && !el.querySelector("img")) {
    const textEl = firstChild || el;
    const ts = textEl.style;
    const props: ZbTextProps = {
      content: (firstChild ? firstChild.innerHTML : el.innerHTML) || textContent,
      fontFamily: ts.fontFamily || "Inter, sans-serif",
      fontSize: parsePx(ts.fontSize) || 16,
      fontWeight: parseInt(ts.fontWeight || "400", 10) || 400,
      lineHeight: parseFloat(ts.lineHeight || "1.5") || 1.5,
      letterSpacing: parsePx(ts.letterSpacing),
      color: ts.color || "#1a1a1a",
      textAlign: (ts.textAlign as "left" | "center" | "right") || "left",
      autoHeight: !s.height,
    };
    return { id, type: "text", x, y, w, h, rot, opacity, zIndex, visible: true, name: name ?? "Текст", props: props as unknown as Record<string, unknown>, ...meta };
  }

  // Fallback: wrap as HTML block
  return {
    id, type: "html", x, y, w, h, rot, opacity, zIndex, visible: true,
    name: name ?? el.tagName.toLowerCase(),
    props: { html: el.innerHTML || "", css: "", js: "" },
    ...meta,
  };
}

/** Parse zero-block section HTML (from session) into ZbElement[]. Client-only. */
export function zbParseHtmlToElements(sectionHtml: string): ZbElement[] {
  if (typeof window === "undefined") return [];
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sectionHtml, "text/html");
    const canvas = doc.querySelector<HTMLElement>(".lemnity-zero-canvas");
    const source = canvas ?? doc.querySelector<HTMLElement>("section.lemnity-zero-block");
    if (!source) return [];

    return Array.from(source.children)
      .filter((el): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) return false;
        const tag = el.tagName.toLowerCase();
        if (tag === "style" || tag === "script") return false;
        if (el.getAttribute("data-ln-editor-hint") === "1") return false;
        if (el.getAttribute("data-ln-zero-canvas") === "1") return false;
        return true;
      })
      .map((el, i) => elementFromAbsolute(el, i));
  } catch {
    return [];
  }
}

/** Extract canvas config hints from the section element (background, min-height). */
export function zbParseSectionMeta(sectionHtml: string): { background?: string; minHeight?: number } {
  if (typeof window === "undefined") return {};
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(sectionHtml, "text/html");
    const section = doc.querySelector<HTMLElement>("section.lemnity-zero-block");
    if (!section) return {};
    const s = section.style;
    const bg = s.background || s.backgroundColor || undefined;
    const minH = parsePx(s.minHeight) || undefined;
    return { background: bg, minHeight: minH || undefined };
  } catch {
    return {};
  }
}

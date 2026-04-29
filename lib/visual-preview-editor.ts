/**
 * Визуальный режим превью в iframe (same origin): hover + выбор; правки применяются к DOM превью (см. apply-visual-updates).
 */

import { buildLayoutSnapshot, formatOverlayLabel } from "@/lib/editor/layout-element";
import type { LayoutElementSnapshot } from "@/lib/editor/layout-element";
import { createOverlayController, removeOverlayRoot } from "@/lib/editor/canvas-overlay";
import { compactHtmlDocumentForPatch } from "@/lib/compact-html-for-save";

export const LEMNITY_VISUAL_EDIT_STYLE_ID = "lemnity-visual-edit-style";

const NON_TEXT_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "HTML",
  "HEAD",
  "META",
  "LINK",
  "TITLE",
  "NOSCRIPT",
  "IFRAME",
  "SVG",
  "CANVAS",
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "VIDEO",
  "AUDIO",
  "OBJECT",
  "EMBED",
  "MAP",
  "AREA"
]);

const PICK_SKIP_TAGS = new Set(["HTML", "BODY", "HEAD", "SCRIPT", "STYLE", "META", "LINK", "TITLE", "NOSCRIPT"]);

/** Ссылки и кнопки: отдельный выбор + блокировка навигации в режиме визреда. */
const ACTIONABLE_SELECTOR =
  'a[href], button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"], input[type="image"], area[href], [role="link"][href]';

const SVG_NS = "http://www.w3.org/2000/svg";

const TEXT_HOST_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "UL",
  "OL",
  "TD",
  "TH",
  "BLOCKQUOTE",
  "FIGCAPTION",
  "SPAN",
  "A",
  "LABEL",
  "STRONG",
  "EM",
  "B",
  "I",
  "SMALL",
  "SUB",
  "SUP",
  "CODE",
  "PRE",
  "DIV",
  "SECTION",
  "ARTICLE",
  "HEADER",
  "FOOTER",
  "NAV",
  "MAIN",
  "ASIDE",
  "BUTTON",
  "DD",
  "DT",
  "TIME",
  "MARK",
  "CAPTION"
]);

/** Узлы из iframe принадлежат другому realm — `instanceof Element` даёт false (логи: topTags «?», pick null). */
function isElementNode(n: unknown): n is Element {
  return typeof n === "object" && n !== null && (n as Node).nodeType === Node.ELEMENT_NODE;
}

/** @deprecated используйте LayoutElementSnapshot */
export type VisualPickInfo = {
  tagName: string;
  id: string;
  className: string;
};

function eventTargetToElement(target: EventTarget | null): Element | null {
  if (target == null) return null;
  const node = target as Node;
  if (node.nodeType === Node.TEXT_NODE) return (target as Text).parentElement;
  if (node.nodeType === Node.ELEMENT_NODE) return target as Element;
  return null;
}

function normalizePickTarget(doc: Document, start: Element | null): Element | null {
  let el: Element | null = start;
  while (el) {
    if (!PICK_SKIP_TAGS.has(el.tagName)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

function viewportPointForVisualPick(ev: PointerEvent | MouseEvent, doc: Document): { x: number; y: number } {
  const win = doc.defaultView;
  if (!win) return { x: ev.clientX, y: ev.clientY };
  if (ev.view === win) return { x: ev.clientX, y: ev.clientY };
  const frame = win.frameElement;
  if (frame) {
    const r = frame.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  return { x: ev.clientX, y: ev.clientY };
}

function isActionableInteractive(el: Element): boolean {
  const tag = el.tagName;
  if (tag === "A") {
    const href = (el as HTMLAnchorElement).getAttribute("href");
    return Boolean(
      href &&
        href.trim() !== "" &&
        href !== "#" &&
        !href.trim().toLowerCase().startsWith("javascript:")
    );
  }
  if (tag === "BUTTON") return true;
  if (tag === "INPUT") {
    const type = ((el as HTMLInputElement).type || "text").toLowerCase();
    return type === "button" || type === "submit" || type === "reset" || type === "image";
  }
  if (tag === "AREA") {
    const href = (el as HTMLAreaElement).getAttribute("href");
    return Boolean(href && href.trim() !== "");
  }
  const role = el.getAttribute("role");
  if (role === "button") return true;
  if (role === "link") {
    const href = el.getAttribute("href");
    return Boolean(href && href.trim() !== "" && href !== "#");
  }
  return false;
}

function pickInteractiveTargetAtPoint(doc: Document, x: number, y: number): Element | null {
  let stack: unknown[];
  try {
    stack = [...doc.elementsFromPoint(x, y)];
  } catch {
    return null;
  }
  if (!stack?.length) return null;

  for (const node of stack) {
    if (!isElementNode(node)) continue;
    if (node.tagName === "IMG") return node;
  }

  for (const node of stack) {
    if (!isElementNode(node)) continue;
    if (node.namespaceURI === SVG_NS && node.tagName.toLowerCase() === "image") return node as Element;
  }

  for (const node of stack) {
    if (!isElementNode(node)) continue;
    const hit = (node as Element).closest?.(ACTIONABLE_SELECTOR);
    if (hit && isActionableInteractive(hit)) return hit;
  }

  // Иначе meaningful() выберет DIV-обёртку из‑за querySelector("svg") — берём верхний узел внутри svg (path, g…).
  for (const node of stack) {
    if (!isElementNode(node)) continue;
    const svgRoot = node.closest?.("svg");
    if (!svgRoot) continue;
    if (node === svgRoot) continue;
    const tag = node.tagName.toUpperCase();
    if (PICK_SKIP_TAGS.has(tag)) continue;
    const normalized = normalizePickTarget(doc, node as Element);
    if (normalized) return normalized;
  }

  for (const node of stack) {
    if (!isElementNode(node)) continue;
    if (node.tagName === "SVG") return node as Element;
  }

  function meaningful(el: Element): boolean {
    if (el.tagName === "IMG") return true;
    if (NON_TEXT_TAGS.has(el.tagName) && el.tagName !== "IMG") return false;
    if (el.tagName === "BODY" || el.tagName === "HTML") return false;
    if (TEXT_HOST_TAGS.has(el.tagName)) {
      if (el.textContent?.trim()) return true;
      if (el.querySelector("img,svg,video,canvas,picture")) return true;
      const html = el as HTMLElement;
      try {
        const r = html.getBoundingClientRect();
        if (r.width >= 8 && r.height >= 8) return true;
      } catch {
        /* ignore */
      }
    }
    return false;
  }

  for (const node of stack) {
    if (!isElementNode(node)) continue;
    const normalized = normalizePickTarget(doc, node);
    if (!normalized) continue;
    if (meaningful(normalized)) return normalized;
  }

  for (const node of stack) {
    if (!isElementNode(node)) continue;
    const normalized = normalizePickTarget(doc, node);
    if (normalized && !PICK_SKIP_TAGS.has(normalized.tagName)) return normalized;
  }
  return null;
}

function describePickTarget(el: Element): VisualPickInfo {
  const tagName = el.tagName.toLowerCase();
  const html = el as HTMLElement;
  const id = html.id?.trim() ?? "";
  let cls = "";
  if (typeof html.className === "string" && html.className.trim()) {
    cls = html.className.trim().split(/\s+/).slice(0, 4).join(" ");
  }
  return { tagName, id, className: cls };
}

export function formatVisualPickLabel(info: VisualPickInfo): string {
  if (info.id) return `${info.tagName}#${info.id}`;
  if (info.className) {
    const parts = info.className.split(/\s+/).filter(Boolean);
    return `${info.tagName}.${parts.join(".")}`;
  }
  return info.tagName;
}

export type VisualPreviewEditorHandlers = {
  onSelectionChange?: (
    snapshot: LayoutElementSnapshot | null,
    legacyPick: VisualPickInfo | null,
    element: Element | null,
    elements: Element[]
  ) => void;
};

export type VisualPreviewEditorHandle = {
  detach: () => void;
  /** Снять выделение в iframe и обновить overlay/React-состояние через onSelectionChange. */
  clearSelection: () => void;
  /** Выбрать узел программно (должен принадлежать тому же `document`, что и редактор). */
  selectElement: (el: Element | null) => void;
};

export function attachVisualPreviewEditor(
  doc: Document,
  handlers: VisualPreviewEditorHandlers
): VisualPreviewEditorHandle {
  const body = doc.body;
  if (!body) {
    return {
      detach: () => {},
      clearSelection: () => {},
      selectElement: () => {}
    };
  }

  body.classList.add("lemnity-visual-edit-mode");

  let styleEl = doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID);
  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = LEMNITY_VISUAL_EDIT_STYLE_ID;
    styleEl.textContent = `
      .lemnity-visual-edit-mode {
        cursor: crosshair !important;
        user-select: none !important;
      }
      .lemnity-visual-edit-mode [data-lemnity-pick-hover="1"] {
        outline: 2px solid #9333EA !important;
        outline-offset: 2px;
      }
      .lemnity-visual-edit-mode [data-lemnity-selected="1"] {
        outline: 3px solid #6C4EFF !important;
        outline-offset: 2px;
      }
      .lemnity-visual-edit-mode img {
        cursor: pointer !important;
      }
    `;
    doc.head.appendChild(styleEl);
  }

  const overlay = createOverlayController(doc);

  let hoverEl: Element | null = null;
  let selectedEl: Element | null = null;
  const selectedEls = new Set<Element>();
  let rafHover = 0;

  function legacyFrom(el: Element | null): VisualPickInfo | null {
    return el ? describePickTarget(el) : null;
  }

  function notifySelection() {
    const primary = selectedEl;
    const snap = primary ? buildLayoutSnapshot(primary) : null;
    handlers.onSelectionChange?.(snap, legacyFrom(primary), primary, Array.from(selectedEls));
    if (primary) {
      const lab = formatOverlayLabel(primary);
      overlay.setSelected(primary, lab.primary, lab.secondary);
    } else {
      overlay.setSelected(null, "", "");
    }
  }

  function setHover(el: Element | null) {
    if (hoverEl === el) return;
    if (hoverEl) hoverEl.removeAttribute("data-lemnity-pick-hover");
    hoverEl = el;
    if (hoverEl) hoverEl.setAttribute("data-lemnity-pick-hover", "1");
    if (hoverEl && hoverEl !== selectedEl) {
      const lab = formatOverlayLabel(hoverEl);
      overlay.setHover(hoverEl, lab.primary, lab.secondary);
    } else {
      overlay.setHover(null, "", "");
    }
  }

  function clearSelected() {
    if (selectedEls.size === 0 && !selectedEl) return;
    selectedEls.forEach((n) => n.removeAttribute("data-lemnity-selected"));
    selectedEls.clear();
    selectedEl = null;
    notifySelection();
  }

  function setSingleSelected(el: Element | null) {
    if (!el) {
      clearSelected();
      return;
    }
    const alreadySingle = selectedEl === el && selectedEls.size === 1 && selectedEls.has(el);
    if (alreadySingle) return;
    selectedEls.forEach((n) => n.removeAttribute("data-lemnity-selected"));
    selectedEls.clear();
    selectedEls.add(el);
    el.setAttribute("data-lemnity-selected", "1");
    selectedEl = el;
    notifySelection();
  }

  function toggleSelected(el: Element) {
    if (selectedEls.has(el)) {
      el.removeAttribute("data-lemnity-selected");
      selectedEls.delete(el);
      if (selectedEl === el) {
        const tail = Array.from(selectedEls);
        selectedEl = tail.length > 0 ? tail[tail.length - 1] : null;
      }
      notifySelection();
      return;
    }
    selectedEls.add(el);
    el.setAttribute("data-lemnity-selected", "1");
    selectedEl = el;
    notifySelection();
  }

  function onPointerMove(ev: PointerEvent) {
    if (rafHover) return;
    rafHover = requestAnimationFrame(() => {
      rafHover = 0;
      const { x, y } = viewportPointForVisualPick(ev, doc);
      const el = pickInteractiveTargetAtPoint(doc, x, y);
      if ((el != null && el.tagName === "IMG") || (el != null && selectedEls.has(el))) {
        setHover(null);
      } else {
        setHover(el);
      }
    });
  }

  function onPointerDown(ev: PointerEvent) {
    const { x, y } = viewportPointForVisualPick(ev, doc);
    const pick =
      pickInteractiveTargetAtPoint(doc, x, y) ?? normalizePickTarget(doc, eventTargetToElement(ev.target));
    const additiveSelect = ev.metaKey || ev.ctrlKey;

    if (pick != null && pick.tagName === "IMG") {
      ev.preventDefault();
      ev.stopPropagation();
      setHover(null);
      if (additiveSelect) {
        toggleSelected(pick);
      } else {
        setSingleSelected(pick);
      }
      return;
    }

    if (!pick) return;

    ev.preventDefault();
    ev.stopPropagation();

    if (additiveSelect) {
      setHover(null);
      toggleSelected(pick);
      return;
    }

    setHover(null);
    setSingleSelected(pick);
  }

  function onClickCapture(ev: MouseEvent) {
    const el = eventTargetToElement(ev.target);
    if (!el) return;
    const actionable = el.closest(ACTIONABLE_SELECTOR);
    if (actionable && isActionableInteractive(actionable)) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  doc.addEventListener("click", onClickCapture, true);
  doc.addEventListener("auxclick", onClickCapture, true);

  doc.addEventListener("pointermove", onPointerMove, true);
  doc.addEventListener("pointerdown", onPointerDown, true);

  function detachImpl() {
    cancelAnimationFrame(rafHover);
    doc.removeEventListener("click", onClickCapture, true);
    doc.removeEventListener("auxclick", onClickCapture, true);
    doc.removeEventListener("pointermove", onPointerMove, true);
    doc.removeEventListener("pointerdown", onPointerDown, true);
    overlay.destroy();
    removeOverlayRoot(doc);
    setHover(null);
    selectedEls.forEach((n) => n.removeAttribute("data-lemnity-selected"));
    selectedEls.clear();
    selectedEl = null;
    doc.querySelectorAll("[data-lemnity-pick-hover]").forEach((n) => n.removeAttribute("data-lemnity-pick-hover"));
    body.classList.remove("lemnity-visual-edit-mode");
    doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
  }

  return {
    detach: detachImpl,
    clearSelection: clearSelected,
    selectElement(el: Element | null) {
      if (el == null) {
        clearSelected();
        return;
      }
      if (el.ownerDocument !== doc || !body.contains(el)) {
        clearSelected();
        return;
      }
      const normalized = normalizePickTarget(doc, el);
      if (!normalized) {
        clearSelected();
        return;
      }
      setSingleSelected(normalized);
    }
  };
}

export function serializeIframeDocument(doc: Document): string {
  /** Парсим клон дерева: не трогаем живой документ iframe (иначе при сохранении исчезает overlay и стили режима — кажется «сбросом»). */
  const parsed = new DOMParser().parseFromString(doc.documentElement.outerHTML, "text/html");
  parsed.querySelectorAll("[data-lemnity-pick-hover]").forEach((el) => el.removeAttribute("data-lemnity-pick-hover"));
  parsed.querySelectorAll("[data-lemnity-selected]").forEach((el) => el.removeAttribute("data-lemnity-selected"));
  parsed.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
  parsed.getElementById("lemnity-visual-overlay-root")?.remove();
  parsed.getElementById("lemnity-visual-overlay-style")?.remove();
  parsed.body?.classList.remove("lemnity-visual-edit-mode");
  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "<!DOCTYPE html>";
  const raw = `${doctype}\n${parsed.documentElement.outerHTML}`;
  return compactHtmlDocumentForPatch(raw);
}

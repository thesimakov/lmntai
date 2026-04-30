/**
 * Визуальный режим превью в iframe (same origin): hover + выбор; правки применяются к DOM превью (см. apply-visual-updates).
 */

import { buildLayoutSnapshot, formatOverlayLabel } from "@/lib/editor/layout-element";
import type { LayoutElementSnapshot } from "@/lib/editor/layout-element";
import {
  createOverlayController,
  LEMNITY_OVERLAY_ROOT_ID,
  removeOverlayRoot,
  type MoveToolbarDirection
} from "@/lib/editor/canvas-overlay";
import { compactHtmlDocumentForPatch } from "@/lib/compact-html-for-save";
import { shrinkHeavyInlineAssetsInDocument } from "@/lib/visual-html-shrink";

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

/** Не использовать overlay-полосы (родитель `#lemnity-visual-overlay-root` с pointer-events:none), кроме тулбара — он обрабатывается отдельно. */
function isVisualPickStackEntry(el: Element): boolean {
  const rootId = `#${LEMNITY_OVERLAY_ROOT_ID}`;
  if (!el.closest(rootId)) return true;
  return Boolean(el.closest("[data-lmnt-move-toolbar]"));
}

function meaningfulVisualPickTarget(el: Element): boolean {
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

function pickInteractiveTargetFromFilteredStack(stack: Element[], doc: Document): Element | null {
  for (const node of stack) {
    if (node.tagName === "IMG") return node;
  }

  for (const node of stack) {
    if (node.namespaceURI === SVG_NS && node.tagName.toLowerCase() === "image") return node;
  }

  for (const node of stack) {
    const hit = node.closest?.(ACTIONABLE_SELECTOR);
    if (hit && isActionableInteractive(hit)) return hit;
  }

  // Иначе meaningful() выберет DIV-обёртку из‑за querySelector("svg") — берём верхний узел внутри svg (path, g…).
  for (const node of stack) {
    const svgRoot = node.closest?.("svg");
    if (!svgRoot) continue;
    if (node === svgRoot) continue;
    const tag = node.tagName.toUpperCase();
    if (PICK_SKIP_TAGS.has(tag)) continue;
    const normalized = normalizePickTarget(doc, node);
    if (normalized) return normalized;
  }

  for (const node of stack) {
    if (node.tagName === "SVG") return node;
  }

  for (const node of stack) {
    const normalized = normalizePickTarget(doc, node);
    if (!normalized) continue;
    if (meaningfulVisualPickTarget(normalized)) return normalized;
  }

  for (const node of stack) {
    const normalized = normalizePickTarget(doc, node);
    if (normalized && !PICK_SKIP_TAGS.has(normalized.tagName)) return normalized;
  }
  return null;
}

/** Несколько вариантов выбора на одной точке (стек браузера): для Alt+клика — прокол следующего слоя без смены координат. */
export function enumeratePickCandidatesAtWindowPoint(doc: Document, x: number, y: number): Element[] {
  let raw: Element[] = [];
  try {
    raw = [...doc.elementsFromPoint(x, y)].filter(isElementNode) as Element[];
  } catch {
    return [];
  }
  const stack = raw.filter(isVisualPickStackEntry);
  const seen = new Set<Element>();
  const out: Element[] = [];
  for (let k = 0; k < stack.length; k++) {
    const cand = pickInteractiveTargetFromFilteredStack(stack.slice(k), doc);
    if (cand != null && !seen.has(cand)) {
      seen.add(cand);
      out.push(cand);
    }
  }
  return out;
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
  const list = enumeratePickCandidatesAtWindowPoint(doc, x, y);
  return list[0] ?? null;
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
  /** Панель стрелок на оверлее (одиночный выбор: контейнеры и вложенные блоки). */
  onMoveDirection?: (direction: MoveToolbarDirection) => void;
  moveToolbarLabels?: { up: string; down: string; left: string; right: string };
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

  const overlay = createOverlayController(doc, {
    onMoveDirection: handlers.onMoveDirection
      ? (d: MoveToolbarDirection) => handlers.onMoveDirection?.(d)
      : undefined
  });

  let hoverEl: Element | null = null;
  let selectedEl: Element | null = null;
  const selectedEls = new Set<Element>();
  let rafHover = 0;

  /** Сброс Alt-«прокола» при заметном сдвиге курсора (между кликами на месте счётчик не трогаем). */
  let pickProbePrev: { x: number; y: number } | null = null;
  let altPickDrillTier = 0;

  function updatePickProbeAndMaybeResetAltDrill(px: number, py: number) {
    if (pickProbePrev) {
      const d = Math.hypot(px - pickProbePrev.x, py - pickProbePrev.y);
      if (d > 8) altPickDrillTier = 0;
    }
    pickProbePrev = { x: px, y: py };
  }

  function legacyFrom(el: Element | null): VisualPickInfo | null {
    return el ? describePickTarget(el) : null;
  }

  function notifySelection() {
    const primary = selectedEl;
    const snap = primary ? buildLayoutSnapshot(primary) : null;
    handlers.onSelectionChange?.(snap, legacyFrom(primary), primary, Array.from(selectedEls));
    if (primary) {
      const lab = formatOverlayLabel(primary);
      const tag = primary.tagName.toUpperCase();
      const movable =
        tag !== "HTML" &&
        tag !== "BODY" &&
        snap?.elementType != null &&
        selectedEls.size === 1;
      const showMove = Boolean(handlers.onMoveDirection && movable);
      overlay.setSelected(
        primary,
        lab.primary,
        lab.secondary,
        showMove,
        showMove ? handlers.moveToolbarLabels ?? null : null
      );
    } else {
      overlay.setSelected(null, "", "", false, null);
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
      updatePickProbeAndMaybeResetAltDrill(x, y);
      const el = pickInteractiveTargetAtPoint(doc, x, y);
      if ((el != null && el.tagName === "IMG") || (el != null && selectedEls.has(el))) {
        setHover(null);
      } else {
        setHover(el);
      }
    });
  }

  function onPointerDown(ev: PointerEvent) {
    const pt = eventTargetToElement(ev.target);
    if (pt?.closest("[data-lmnt-move-toolbar]")) return;

    const { x, y } = viewportPointForVisualPick(ev, doc);
    updatePickProbeAndMaybeResetAltDrill(x, y);

    const candidates = enumeratePickCandidatesAtWindowPoint(doc, x, y);
    /** Alt + клик по тому же месту: следующий альтернативный элемент из стека (под огромными обёртками часто нужен второй/третий кандидат). */
    if (!ev.altKey) {
      altPickDrillTier = 0;
    } else if (candidates.length > 0) {
      altPickDrillTier = Math.min(altPickDrillTier + 1, candidates.length - 1);
    }

    const additiveSelect = (ev.metaKey || ev.ctrlKey) && !ev.altKey;

    let pick: Element | null =
      candidates.length > 0
        ? candidates[Math.min(altPickDrillTier, candidates.length - 1)] ?? null
        : null;
    pick = pick ?? normalizePickTarget(doc, eventTargetToElement(ev.target));

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
    /** Кнопки панели перемещения в оверлее — обычные `<button>`; общий блок навигации не должен гасить им click. */
    if (el.closest("[data-lmnt-move-toolbar]")) return;
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

export type SerializeIframeVisualResult = {
  html: string;
  /** Подставили лёгкий placeholder вместо слишком длинных inline data:image для прохождения лимита тела PATCH. */
  replacedHeavyInlineAssets: boolean;
};

export function serializeIframeDocument(doc: Document): SerializeIframeVisualResult {
  /** Парсим клон дерева: не трогаем живой документ iframe (иначе при сохранении исчезает overlay и стили режима — кажется «сбросом»). */
  const parsed = new DOMParser().parseFromString(doc.documentElement.outerHTML, "text/html");
  parsed.querySelectorAll("[data-lemnity-pick-hover]").forEach((el) => el.removeAttribute("data-lemnity-pick-hover"));
  parsed.querySelectorAll("[data-lemnity-selected]").forEach((el) => el.removeAttribute("data-lemnity-selected"));
  parsed.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
  parsed.getElementById("lemnity-visual-overlay-root")?.remove();
  parsed.getElementById("lemnity-visual-overlay-style")?.remove();
  parsed.body?.classList.remove("lemnity-visual-edit-mode");
  const replacedHeavyInlineAssets = shrinkHeavyInlineAssetsInDocument(parsed);
  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "<!DOCTYPE html>";
  const raw = `${doctype}\n${parsed.documentElement.outerHTML}`;
  return { html: compactHtmlDocumentForPatch(raw), replacedHeavyInlineAssets };
}

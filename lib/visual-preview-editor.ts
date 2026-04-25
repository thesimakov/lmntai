/** Визуальное редактирование HTML внутри iframe превью (тот же origin). Выбор элемента: hover + клик. Текст: второй клик по тому же блоку (~0,42 с) или dblclick — правка (preventDefault на pointerdown ломает нативный dblclick у части браузеров). */

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
  "IMG",
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

/** Не предлагаем как цель «пикера» (корень документа и служебные узлы). */
const PICK_SKIP_TAGS = new Set([
  "HTML",
  "BODY",
  "HEAD",
  "SCRIPT",
  "STYLE",
  "META",
  "LINK",
  "TITLE",
  "NOSCRIPT"
]);

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

/** Обёртки таблицы (без TABLE — иначе клик вылезает к секции снаружи). */
const TEXT_HOST_TRANSPARENT = new Set(["TR", "TBODY", "THEAD", "TFOOT", "COLGROUP", "COL"]);

export type VisualPickInfo = {
  tagName: string;
  id: string;
  className: string;
};

function eventTargetToElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) return target;
  if (target instanceof Text) return target.parentElement;
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

/**
 * Координаты для doc.elementsFromPoint: в большинстве случаев clientX/Y уже относительно iframe,
 * но если view события не совпадает с документом превью — переводим через getBoundingClientRect рамки.
 */
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

/** Обход перекрывающих full-screen слоёв: elementFromPoint часто попадает только в верхний div. */
function pickInteractiveTargetAtPoint(doc: Document, x: number, y: number): Element | null {
  let stack: Element[];
  try {
    stack = doc.elementsFromPoint(x, y) as Element[];
  } catch {
    return null;
  }
  if (!stack?.length) return null;

  for (const node of stack) {
    if (node instanceof HTMLImageElement) return node;
  }

  function meaningful(el: Element): boolean {
    if (el instanceof HTMLImageElement) return true;
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
    if (!(node instanceof Element)) continue;
    const normalized = normalizePickTarget(doc, node);
    if (!normalized) continue;
    if (meaningful(normalized)) return normalized;
  }

  for (const node of stack) {
    if (!(node instanceof Element)) continue;
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
  onImageActivate: (img: HTMLImageElement) => void;
  onSelectionChange?: (info: VisualPickInfo | null) => void;
};

export function attachVisualPreviewEditor(doc: Document, handlers: VisualPreviewEditorHandlers): () => void {
  const body = doc.body;
  if (!body) return () => {};

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
      .lemnity-visual-edit-mode [contenteditable="true"] {
        cursor: text !important;
        user-select: text !important;
      }
      .lemnity-visual-edit-mode [data-lemnity-pick-hover="1"] {
        outline: 2px solid rgba(96, 165, 250, 0.95) !important;
        outline-offset: 2px;
      }
      .lemnity-visual-edit-mode [data-lemnity-selected="1"] {
        outline: 2px solid rgb(37, 99, 235) !important;
        outline-offset: 2px;
      }
      .lemnity-visual-edit-mode img {
        cursor: pointer !important;
        outline: 2px dashed rgba(168, 85, 247, 0.85) !important;
      }
      .lemnity-visual-edit-mode [data-lemnity-editing="1"] {
        outline: 2px solid rgb(59, 130, 246) !important;
        outline-offset: 2px;
      }
    `;
    doc.head.appendChild(styleEl);
  }

  let activeHost: HTMLElement | null = null;
  let hoverEl: Element | null = null;
  let selectedEl: Element | null = null;
  let rafHover = 0;
  /** Двойной клик по тексту: preventDefault на pointerdown ломает нативный dblclick в части браузеров. */
  let lastTextHostPointer: HTMLElement | null = null;
  let lastTextHostPointerAt = 0;

  function notifySelection(el: Element | null) {
    handlers.onSelectionChange?.(el ? describePickTarget(el) : null);
  }

  function setHover(el: Element | null) {
    if (hoverEl === el) return;
    if (hoverEl) hoverEl.removeAttribute("data-lemnity-pick-hover");
    hoverEl = el;
    if (hoverEl) hoverEl.setAttribute("data-lemnity-pick-hover", "1");
  }

  function setSelected(el: Element | null) {
    if (selectedEl === el) return;
    if (selectedEl) selectedEl.removeAttribute("data-lemnity-selected");
    selectedEl = el;
    if (selectedEl) selectedEl.setAttribute("data-lemnity-selected", "1");
    notifySelection(selectedEl);
  }

  function deactivateHost() {
    if (!activeHost) return;
    activeHost.removeAttribute("data-lemnity-editing");
    activeHost.removeAttribute("contenteditable");
    activeHost = null;
  }

  function resolveTextHost(start: Element | null): HTMLElement | null {
    if (start?.closest) {
      const cell = start.closest("td, th, caption");
      if (cell instanceof HTMLElement) start = cell;
    }
    let el: Element | null = start;
    while (el && el !== body) {
      const tag = el.tagName;
      if (NON_TEXT_TAGS.has(tag)) return null;
      if (tag === "IMG") return null;
      if (TEXT_HOST_TRANSPARENT.has(tag)) {
        el = el.parentElement;
        continue;
      }
      if (TEXT_HOST_TAGS.has(tag)) return el as HTMLElement;
      el = el.parentElement;
    }
    return null;
  }

  function enterTextEdit(host: HTMLElement) {
    deactivateHost();
    setSelected(host);
    activeHost = host;
    host.setAttribute("contenteditable", "true");
    host.setAttribute("data-lemnity-editing", "1");
    host.focus();
    const sel = doc.getSelection();
    if (sel) {
      try {
        const r = doc.createRange();
        r.selectNodeContents(host);
        r.collapse(false);
        sel.removeAllRanges();
        sel.addRange(r);
      } catch {
        // ignore
      }
    }
  }

  function onPointerMove(ev: PointerEvent) {
    if (activeHost) return;
    if (rafHover) return;
    rafHover = requestAnimationFrame(() => {
      rafHover = 0;
      if (activeHost) return;
      const { x, y } = viewportPointForVisualPick(ev, doc);
      const el = pickInteractiveTargetAtPoint(doc, x, y);
      if (el instanceof HTMLImageElement || el === selectedEl) {
        setHover(null);
      } else {
        setHover(el);
      }
    });
  }

  function onPointerDown(ev: PointerEvent) {
    if (activeHost && activeHost.contains(ev.target as Node)) {
      return;
    }

    const { x, y } = viewportPointForVisualPick(ev, doc);
    const pick =
      pickInteractiveTargetAtPoint(doc, x, y) ??
      normalizePickTarget(doc, eventTargetToElement(ev.target));

    if (pick instanceof HTMLImageElement) {
      lastTextHostPointer = null;
      lastTextHostPointerAt = 0;
      ev.preventDefault();
      ev.stopPropagation();
      deactivateHost();
      setHover(null);
      setSelected(pick);
      handlers.onImageActivate(pick);
      return;
    }

    if (!pick) return;

    ev.preventDefault();
    ev.stopPropagation();

    const textHost = resolveTextHost(pick);
    if (textHost) {
      const now = Date.now();
      if (textHost === lastTextHostPointer && now - lastTextHostPointerAt < 420) {
        lastTextHostPointer = null;
        lastTextHostPointerAt = 0;
        setHover(null);
        enterTextEdit(textHost);
        return;
      }
      lastTextHostPointer = textHost;
      lastTextHostPointerAt = now;
      deactivateHost();
      setHover(null);
      setSelected(textHost);
      return;
    }

    lastTextHostPointer = null;
    lastTextHostPointerAt = 0;
    deactivateHost();
    setHover(null);
    setSelected(pick);
  }

  function onDoubleClick(ev: MouseEvent) {
    if (activeHost) return;
    const { x, y } = viewportPointForVisualPick(ev, doc);
    const raw = pickInteractiveTargetAtPoint(doc, x, y) ?? eventTargetToElement(ev.target);
    const host = resolveTextHost(raw);
    if (!host) return;
    ev.preventDefault();
    ev.stopPropagation();
    lastTextHostPointer = null;
    lastTextHostPointerAt = 0;
    enterTextEdit(host);
  }

  function onFocusOut(ev: FocusEvent) {
    const related = ev.relatedTarget as Node | null;
    window.requestAnimationFrame(() => {
      if (!activeHost) return;
      if (related instanceof Node && activeHost.contains(related)) return;
      if (doc.activeElement && activeHost.contains(doc.activeElement)) return;
      deactivateHost();
    });
  }

  doc.addEventListener("pointermove", onPointerMove, true);
  doc.addEventListener("pointerdown", onPointerDown, true);
  doc.addEventListener("dblclick", onDoubleClick, true);
  body.addEventListener("focusout", onFocusOut, true);

  return () => {
    cancelAnimationFrame(rafHover);
    doc.removeEventListener("pointermove", onPointerMove, true);
    doc.removeEventListener("pointerdown", onPointerDown, true);
    doc.removeEventListener("dblclick", onDoubleClick, true);
    body.removeEventListener("focusout", onFocusOut, true);
    deactivateHost();
    setHover(null);
    setSelected(null);
    body.classList.remove("lemnity-visual-edit-mode");
    doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
    doc.querySelectorAll("[data-lemnity-pick-hover]").forEach((n) => n.removeAttribute("data-lemnity-pick-hover"));
    doc.querySelectorAll("[data-lemnity-selected]").forEach((n) => n.removeAttribute("data-lemnity-selected"));
  };
}

/** Снимает служебную разметку редактора и возвращает полный HTML документа. */
export function serializeIframeDocument(doc: Document): string {
  doc.querySelectorAll("[data-lemnity-editing]").forEach((el) => {
    el.removeAttribute("data-lemnity-editing");
    el.removeAttribute("contenteditable");
  });
  doc.querySelectorAll("[data-lemnity-pick-hover]").forEach((el) => el.removeAttribute("data-lemnity-pick-hover"));
  doc.querySelectorAll("[data-lemnity-selected]").forEach((el) => el.removeAttribute("data-lemnity-selected"));
  doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
  doc.body?.classList.remove("lemnity-visual-edit-mode");
  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "<!DOCTYPE html>";
  return `${doctype}\n${doc.documentElement.outerHTML}`;
}

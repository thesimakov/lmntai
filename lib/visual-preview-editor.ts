/** Визуальное редактирование HTML внутри iframe превью (тот же origin). */

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

const TEXT_HOST_TAGS = new Set([
  "P",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
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
  "BUTTON"
]);

export function attachVisualPreviewEditor(
  doc: Document,
  handlers: { onImageActivate: (img: HTMLImageElement) => void }
): () => void {
  const body = doc.body;
  if (!body) return () => {};

  body.classList.add("lemnity-visual-edit-mode");

  let styleEl = doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID);
  if (!styleEl) {
    styleEl = doc.createElement("style");
    styleEl.id = LEMNITY_VISUAL_EDIT_STYLE_ID;
    styleEl.textContent = `
      .lemnity-visual-edit-mode img { cursor: pointer !important; outline: 2px dashed rgba(168,85,247,.75) !important; }
      .lemnity-visual-edit-mode [data-lemnity-editing="1"] { outline: 2px solid rgb(59,130,246) !important; outline-offset: 2px; }
      .lemnity-visual-edit-mode { cursor: text; }
    `;
    doc.head.appendChild(styleEl);
  }

  let activeHost: HTMLElement | null = null;

  function deactivateHost() {
    if (!activeHost) return;
    activeHost.removeAttribute("data-lemnity-editing");
    activeHost.removeAttribute("contenteditable");
    activeHost = null;
  }

  function resolveTextHost(start: Element | null): HTMLElement | null {
    let el: Element | null = start;
    while (el && el !== body) {
      const tag = el.tagName;
      if (NON_TEXT_TAGS.has(tag)) return null;
      if (tag === "IMG") return null;
      if (TEXT_HOST_TAGS.has(tag)) return el as HTMLElement;
      el = el.parentElement;
    }
    return null;
  }

  function onPointerDown(ev: PointerEvent) {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    if (target instanceof HTMLImageElement) {
      ev.preventDefault();
      ev.stopPropagation();
      deactivateHost();
      handlers.onImageActivate(target);
      return;
    }

    const host = resolveTextHost(target);
    if (!host) return;

    ev.preventDefault();
    ev.stopPropagation();
    deactivateHost();
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

  function onFocusOut() {
    window.setTimeout(() => {
      if (!activeHost) return;
      if (doc.activeElement && activeHost.contains(doc.activeElement)) return;
      deactivateHost();
    }, 80);
  }

  body.addEventListener("pointerdown", onPointerDown, true);
  body.addEventListener("focusout", onFocusOut, true);

  return () => {
    body.removeEventListener("pointerdown", onPointerDown, true);
    body.removeEventListener("focusout", onFocusOut, true);
    deactivateHost();
    body.classList.remove("lemnity-visual-edit-mode");
    doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
  };
}

/** Снимает служебную разметку редактора и возвращает полный HTML документа. */
export function serializeIframeDocument(doc: Document): string {
  doc.querySelectorAll("[data-lemnity-editing]").forEach((el) => {
    el.removeAttribute("data-lemnity-editing");
    el.removeAttribute("contenteditable");
  });
  doc.getElementById(LEMNITY_VISUAL_EDIT_STYLE_ID)?.remove();
  doc.body?.classList.remove("lemnity-visual-edit-mode");
  const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : "<!DOCTYPE html>";
  return `${doctype}\n${doc.documentElement.outerHTML}`;
}

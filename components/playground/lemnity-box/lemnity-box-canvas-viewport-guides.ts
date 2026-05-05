import type { Editor } from "grapesjs";

const STYLE_ID = "lemnity-viewport-guides";

type DeviceSel = { get?: (key: string) => unknown };

function selectedDevice(editor: Editor): DeviceSel | null {
  const ed = editor as Editor & {
    DeviceManager?: { getSelected?: () => DeviceSel | null };
  };
  return (ed.DeviceManager?.getSelected?.() ?? null) as DeviceSel | null;
}

/** ПК / полноширинный режим: у планшета и телефона задан width, у десктопа обычно нет или auto / 100%. */
function isDesktopLikeDevice(sel: DeviceSel | null): boolean {
  if (!sel || typeof sel.get !== "function") return true;
  const width = sel.get("width") as unknown;
  if (width == null || width === "") return true;
  if (typeof width === "number" && !Number.isFinite(width)) return true;
  if (typeof width === "string") {
    const t = width.trim();
    if (t === "" || t.toLowerCase() === "auto" || /^100%/i.test(t)) return true;
  }
  return false;
}

const DOC_CSS = `
/* Только редактор: живёт во фрейме GrapesJS, не в экспорте страницы */
html[data-lemnity-vp-guides="on"] body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483000;
  box-shadow:
    inset 0 0 0 2px rgba(76, 29, 149, 0.68),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
}

/* Граница всего документа, если есть горизонтальная переполнённость за пределы окна */
html[data-lemnity-vp-guides="on"][data-lemnity-vp-h-overflow="true"] {
  outline: 2px dashed rgba(234, 88, 12, 0.75);
  outline-offset: -2px;
}

html[data-lemnity-vp-guides="off"] body::before {
  display: none !important;
}
`;

function ensureGuideStyle(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const s = doc.createElement("style");
  s.id = STYLE_ID;
  s.textContent = DOC_CSS;
  doc.head.appendChild(s);
}

/** Визуально отделяет видимое окно (viewport iframe) от областей макета, уходящих в горизонтальный скролл — только для десктопного превью. Возвращает detach. */
export function attachLemnityBoxCanvasViewportGuides(editor: Editor): () => void {
  let ro: ResizeObserver | undefined;
  let mo: MutationObserver | undefined;
  let rafBusy = false;

  const teardownDomObservers = () => {
    try {
      ro?.disconnect();
    } catch {
      /* ignore */
    }
    try {
      mo?.disconnect();
    } catch {
      /* ignore */
    }
    ro = undefined;
    mo = undefined;
  };

  const updateOverflowHint = () => {
    const doc = editor.Canvas.getDocument();
    const html = doc?.documentElement;
    if (!html) return;
    const desktop = isDesktopLikeDevice(selectedDevice(editor));
    if (!desktop) {
      html.setAttribute("data-lemnity-vp-guides", "off");
      html.removeAttribute("data-lemnity-vp-h-overflow");
      return;
    }
    html.setAttribute("data-lemnity-vp-guides", "on");
    const overflow = html.scrollWidth > html.clientWidth + 2;
    if (overflow) html.setAttribute("data-lemnity-vp-h-overflow", "true");
    else html.removeAttribute("data-lemnity-vp-h-overflow");
  };

  const scheduleUpdate = () => {
    if (rafBusy) return;
    rafBusy = true;
    requestAnimationFrame(() => {
      rafBusy = false;
      updateOverflowHint();
    });
  };

  const bindDocument = () => {
    teardownDomObservers();
    const doc = editor.Canvas.getDocument();
    const html = doc?.documentElement;
    if (!doc || !html) return;
    ensureGuideStyle(doc);
    updateOverflowHint();

    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(scheduleUpdate);
      ro.observe(html);
    }

    mo = new MutationObserver(scheduleUpdate);
    if (doc.body) {
      mo.observe(doc.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "width", "height"],
      });
    }
  };

  const onLoadFrame = () => bindDocument();

const onFrameUnload = () => {
    teardownDomObservers();
  };

  editor.on("load", onLoadFrame);
  editor.on("device:select", scheduleUpdate);
  editor.on("canvas:frame:load", onLoadFrame);
  editor.on("canvas:frame:unload", onFrameUnload);

  return () => {
    editor.off?.("load", onLoadFrame);
    editor.off?.("device:select", scheduleUpdate);
    editor.off?.("canvas:frame:load", onLoadFrame);
    editor.off?.("canvas:frame:unload", onFrameUnload);
    teardownDomObservers();
    const doc = editor.Canvas.getDocument();
    const html = doc?.documentElement;
    if (html) {
      html.removeAttribute("data-lemnity-vp-guides");
      html.removeAttribute("data-lemnity-vp-h-overflow");
    }
    doc?.getElementById(STYLE_ID)?.remove();
  };
}

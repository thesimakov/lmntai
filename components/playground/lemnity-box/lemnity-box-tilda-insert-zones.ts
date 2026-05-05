import type { Editor } from "grapesjs";

const HOST_ID = "gjs-tilda-insert-host";
const STYLE_ID = "gjs-tilda-insert-style";

export type AttachTildaInsertZonesOptions = {
  /** Открыть панель блоков GrapesJS; индекс вставки сохраните снаружи и передайте в append с `at`. */
  onRequestBlockPicker?: (insertAtIndex: number) => void;
};

/** Редактор иногда отдаёт из getEl() не DOM-узел — без этого падает refreshZones. */
function toLayoutElement(raw: unknown): Element | null {
  if (raw == null) return null;
  if (typeof Element !== "undefined" && raw instanceof Element) return raw;
  const legacy = raw as { jquery?: unknown; get?: (i: number) => unknown; length?: number };
  if (legacy.jquery && typeof legacy.get === "function") {
    const first = legacy.get(0);
    if (typeof Element !== "undefined" && first instanceof Element) return first;
  }
  if (typeof (raw as { getBoundingClientRect?: unknown }).getBoundingClientRect === "function") {
    return raw as Element;
  }
  return null;
}

type CanvasComponentLike = {
  getEl?: () => unknown;
  view?: { el?: unknown };
};

function getChildLayoutEl(child: CanvasComponentLike | null | undefined): Element | null {
  if (!child) return null;
  const fromGetEl = typeof child.getEl === "function" ? child.getEl() : undefined;
  const resolved = toLayoutElement(fromGetEl);
  if (resolved) return resolved;
  return toLayoutElement(child.view?.el);
}

function injectStyles(doc: Document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
#gjs-tilda-insert-host {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2147483000;
  overflow: visible;
}
.gjs-tilda-insert-zone {
  position: absolute;
  left: 12px;
  right: 12px;
  height: 32px;
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
}
.gjs-tilda-insert-zone-inner {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gjs-tilda-insert-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 2px dashed rgba(100, 100, 100, 0.4);
  opacity: 0;
  transition: opacity 0.14s ease;
  pointer-events: none;
}
.gjs-tilda-insert-zone:hover .gjs-tilda-insert-line {
  opacity: 1;
}
.gjs-tilda-insert-btn {
  position: relative;
  z-index: 2;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  background: #111;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 300;
  line-height: 1;
  opacity: 0;
  transform: scale(0.9);
  transition: opacity 0.14s ease, transform 0.14s ease;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}
.gjs-tilda-insert-zone:hover .gjs-tilda-insert-btn {
  opacity: 1;
  transform: scale(1);
}
.gjs-tilda-insert-btn:hover {
  background: #000;
}
.gjs-tilda-insert-pop {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.14s ease, transform 0.14s ease;
  background: #111;
  color: #fff;
  border-radius: 8px;
  padding: 9px 12px 9px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
  max-width: min(320px, 90vw);
  cursor: pointer;
}
.gjs-tilda-insert-zone:hover .gjs-tilda-insert-pop {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
  pointer-events: auto;
}
.gjs-tilda-insert-pop-shortcuts {
  display: flex;
  gap: 4px;
  align-items: center;
}
.gjs-tilda-insert-pop-shortcuts button {
  width: 26px;
  height: 26px;
  border-radius: 4px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.85);
  font-size: 12px;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.gjs-tilda-insert-pop-shortcuts button:hover {
  background: rgba(255, 255, 255, 0.2);
}
`;
  doc.head.appendChild(style);
}

function refreshZones(editor: Editor, options?: AttachTildaInsertZonesOptions) {
  const doc = editor.Canvas.getDocument();
  if (!doc?.body) return;

  injectStyles(doc);

  let host = doc.getElementById(HOST_ID) as HTMLDivElement | null;
  if (!host) {
    host = doc.createElement("div");
    host.id = HOST_ID;
    doc.body.appendChild(host);
  }
  host.innerHTML = "";

  const wrapper = editor.getWrapper();
  if (!wrapper) return;

  const childCount = wrapper.components().length;
  const positions: { topPx: number; insertAt: number }[] = [];

  if (childCount === 0) {
    const viewEl = toLayoutElement(wrapper.view?.el);
    if (viewEl) {
      const r = viewEl.getBoundingClientRect();
      positions.push({ topPx: Math.min(r.top + 48, r.bottom - 24), insertAt: 0 });
    }
  } else {
    for (let i = 0; i <= childCount; i++) {
      if (i === 0) {
        const el = getChildLayoutEl(wrapper.getChildAt(0));
        if (el) {
          const r = el.getBoundingClientRect();
          positions.push({ topPx: r.top - 4, insertAt: 0 });
        }
      } else if (i === childCount) {
        const el = getChildLayoutEl(wrapper.getChildAt(childCount - 1));
        if (el) {
          const r = el.getBoundingClientRect();
          positions.push({ topPx: r.bottom + 4, insertAt: childCount });
        }
      } else {
        const a = getChildLayoutEl(wrapper.getChildAt(i - 1));
        const b = getChildLayoutEl(wrapper.getChildAt(i));
        if (a && b) {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          positions.push({ topPx: (ra.bottom + rb.top) / 2, insertAt: i });
        }
      }
    }
  }

  for (const { topPx, insertAt } of positions) {
    const zone = doc.createElement("div");
    zone.className = "gjs-tilda-insert-zone";
    zone.style.top = `${Math.round(topPx)}px`;

    const inner = doc.createElement("div");
    inner.className = "gjs-tilda-insert-zone-inner";

    const line = doc.createElement("div");
    line.className = "gjs-tilda-insert-line";

    const notifyPicker = () => {
      options?.onRequestBlockPicker?.(insertAt);
    };

    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "gjs-tilda-insert-btn";
    btn.textContent = "+";
    btn.setAttribute("aria-label", "Выбрать блок из панели");
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      notifyPicker();
    });

    const pop = doc.createElement("div");
    pop.className = "gjs-tilda-insert-pop";
    pop.setAttribute("role", "button");
    pop.tabIndex = 0;
    pop.innerHTML =
      '<span>Добавить блок</span><span class="gjs-tilda-insert-pop-shortcuts" aria-hidden="true"><button type="button" title="Наверх">↑</button><button type="button" title="Текст">A</button></span>';
    pop.querySelectorAll("button").forEach((b) => {
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
    });
    pop.addEventListener("pointerdown", (e) => e.stopPropagation());
    pop.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      notifyPicker();
    });

    inner.append(line, btn, pop);
    zone.appendChild(inner);
    host.appendChild(zone);
  }
}

/**
 * Зоны вставки между секциями на холсте (стиль Tilda): пунктир, «+», всплывающая подпись.
 * @returns функция отписки (перед destroy редактора).
 */
export function attachTildaInsertZones(editor: Editor, options?: AttachTildaInsertZonesOptions): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      refreshZones(editor, options);
    }, 72);
  };

  const onScroll = () => schedule();
  let scrollWin: Window | null = null;

  const bindFrameScroll = () => {
    if (scrollWin) {
      scrollWin.removeEventListener("scroll", onScroll, true);
      scrollWin = null;
    }
    const w = editor.Canvas.getWindow();
    if (w) {
      w.addEventListener("scroll", onScroll, true);
      scrollWin = w;
    }
  };

  const onFrameLoad = () => {
    schedule();
    bindFrameScroll();
  };

  editor.on("update", schedule);
  editor.on("component:add", schedule);
  editor.on("component:remove", schedule);
  editor.on("component:update", schedule);
  editor.on("canvas:frame:load", onFrameLoad);

  onFrameLoad();

  return () => {
    if (timer) clearTimeout(timer);
    editor.off("update", schedule);
    editor.off("component:add", schedule);
    editor.off("component:remove", schedule);
    editor.off("component:update", schedule);
    editor.off("canvas:frame:load", onFrameLoad);
    if (scrollWin) scrollWin.removeEventListener("scroll", onScroll, true);
    try {
      editor.Canvas.getDocument()?.getElementById(HOST_ID)?.remove();
      editor.Canvas.getDocument()?.getElementById(STYLE_ID)?.remove();
    } catch {
      /* iframe уже уничтожен */
    }
  };
}

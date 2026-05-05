import type { Component, Editor, TraitProperties } from "grapesjs";

/** Стили только в документе iframe редактора. */
export const BLOCK_GRID_DOC_STYLE_ID = "lemnity-block-grid-12-doc";

function isDesktopLikeDevice(editor: Editor): boolean {
  const ed = editor as Editor & {
    DeviceManager?: { getSelected?: () => { get?: (k: string) => unknown } | null };
  };
  const sel = ed.DeviceManager?.getSelected?.();
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

const CANVAS_GRID_DOC_CSS = `
/* Невидимая вертикальная сетка 12 колонок (только редактор) */
html[data-lemnity-grid12="on"] body {
  background-size: calc(100% / 12) 100%;
  background-image:
    repeating-linear-gradient(
      90deg,
      rgba(251, 113, 133, 0.12) 0 1px,
      transparent 1px calc(100% / 12)
    );
}

html[data-lemnity-grid12="off"] body {
  background-size: unset !important;
  background-image: none !important;
}
`;

export function syncBlockGridOverlay(editor: Editor) {
  const doc = editor.Canvas.getDocument();
  const html = doc?.documentElement;
  if (!html) return;
  if (!doc.getElementById(BLOCK_GRID_DOC_STYLE_ID)) {
    const tag = doc.createElement("style");
    tag.id = BLOCK_GRID_DOC_STYLE_ID;
    tag.textContent = CANVAS_GRID_DOC_CSS;
    doc.head.appendChild(tag);
  }
  html.setAttribute("data-lemnity-grid12", isDesktopLikeDevice(editor) ? "on" : "off");
}

function readSpan(attrs: Record<string, string>): number {
  const raw = attrs["data-ln-span"];
  const n = parseInt(raw ?? "12", 10);
  if (!Number.isFinite(n)) return 12;
  return Math.min(12, Math.max(1, n));
}

function readAlign(attrs: Record<string, string>): "left" | "center" | "right" {
  const a = attrs["data-ln-align"];
  if (a === "left" || a === "right" || a === "center") return a;
  return "center";
}

function isLemnityGridSection(component: Component | null | undefined): boolean {
  if (!component?.get) return false;
  if (component.get("type") === "lemnity-grid-section") return true;
  return false;
}

function shouldOfferSideResize(comp: Component, editor: Editor): boolean {
  const wrap = editor.getWrapper?.();
  if (wrap && comp === wrap) return false;
  if (comp.get("type") === "wrapper") return false;
  if (comp.get("selectable") === false) return false;
  if (comp.get("resizable") === false) return false;
  return true;
}

/** У всех блоков кроме body/wrapper включаем ресайз, если пользователь явно не отключил. */
function ensureSideResizeEnabled(comp: Component, editor: Editor): void {
  if (!shouldOfferSideResize(comp, editor)) return;
  const r = comp.get("resizable");
  if (r === true || (typeof r === "object" && r !== null)) return;
  comp.set("resizable", true);
}

function walkEnsureResizable(root: Component | null | undefined, editor: Editor): void {
  if (!root) return;
  ensureSideResizeEnabled(root, editor);
  const children = root.components?.();
  if (!children?.forEach) return;
  children.forEach((child: Component) => walkEnsureResizable(child, editor));
}

function parentContentWidth(sectionEl: HTMLElement | null | undefined, editor: Editor): number {
  if (!sectionEl) return editor.Canvas?.getBody?.()?.clientWidth ?? 1;
  const parent = sectionEl.parentElement;
  const w =
    parent?.clientWidth ??
    editor.Canvas?.getBody?.()?.clientWidth ??
    sectionEl.ownerDocument.documentElement.clientWidth ??
    1;
  return w > 0 ? w : 1;
}

function spanFromPixelWidth(wPx: number, parentW: number): number {
  const n = Math.round((wPx / parentW) * 12);
  return Math.min(12, Math.max(1, n));
}

type ResizeInitOpts = { component?: Component; resizable?: unknown };
type ResizeUpdateOpts = {
  component?: Component;
  el?: HTMLElement;
  rect?: { w: number; t: number; l: number; h: number };
  updateStyle?: (style?: Record<string, string>) => void;
};

/** Ширина и горизонтальное выравнивание секции по сетке 12 колонок. */
export function applyLemnitySectionWidthLayout(component: Component) {
  const tag = String(component.get?.("tagName") ?? "").toLowerCase();
  if (tag !== "section") return;

  component.removeStyle("width");

  const attrs = component.getAttributes();
  const span = readSpan(attrs);
  const align = readAlign(attrs);

  if (span >= 12) {
    component.removeStyle("max-width");
  } else {
    component.addStyle({ "max-width": `${(span / 12) * 100}%` });
  }

  component.addStyle({ "box-sizing": "border-box" });

  if (align === "center") {
    component.addStyle({ "margin-left": "auto", "margin-right": "auto" });
  } else if (align === "right") {
    component.addStyle({ "margin-left": "auto", "margin-right": "0" });
  } else {
    component.addStyle({ "margin-left": "0", "margin-right": "auto" });
  }
}

function walkSectionsApply(wrapper: Component | null | undefined) {
  if (!wrapper?.find) return;
  wrapper.find("section").forEach((c) => applyLemnitySectionWidthLayout(c as Component));
}

/** Прямые дети wrapper — перетаскиваемые блоки страницы (слои / холст). */
function ensureRootBlocksDraggable(wrapper: Component | null | undefined) {
  if (!wrapper?.components) return;
  wrapper.components().forEach((child: Component) => {
    if (child.get("type") === "wrapper") return;
    if (child.get("draggable") === false) child.set("draggable", true);
    if (child.get("layerable") === false) child.set("layerable", true);
  });
}

/**
 * `<style>` внутри секций (шапки и т.д.): иначе их можно перетащить наружу и «оторвать» CSS блока.
 */
function lockInlineStylesInSections(wrapper: Component | null | undefined) {
  if (!wrapper?.find) return;
  wrapper.find("style").forEach((c) => {
    const parent = c.parent?.();
    if (!parent || String(parent.get("tagName") ?? "").toLowerCase() !== "section") return;
    c.set(
      {
        draggable: false,
        droppable: false,
        copyable: false,
        layerable: false,
        highlightable: false,
      },
      { silent: true } as never,
    );
  });
}

/**
 * После DnD / перестановки: сетка, ширины секций, ресайз-хэндлы, блокировка inline-стилей.
 * Экспорт для кнопок тулбара «влево/вправо».
 */
export function scheduleLemnityCanvasLayoutRefresh(editor: Editor) {
  syncBlockGridOverlay(editor);
  queueMicrotask(() => {
    const wrap = editor.getWrapper();
    walkEnsureResizable(wrap, editor);
    walkSectionsApply(wrap);
    lockInlineStylesInSections(wrap);
    ensureRootBlocksDraggable(wrap);
  });
}

function normalizeNewSection(component: Component) {
  if (String(component.get?.("tagName") ?? "").toLowerCase() !== "section") return;
  const a = component.getAttributes();
  if (a["data-ln-span"] != null || a["data-ln-align"] != null) return;
  component.addAttributes({ "data-ln-span": "12", "data-ln-align": "center" }, { silent: true } as never);
}

function registerTraitType(editor: Editor) {
  editor.TraitManager.addType("lemnity-span-12", {
    createInput({ component }: { component: Component }) {
      const root = document.createElement("div");
      root.className = "lemnity-span12-root";

      const head = document.createElement("div");
      head.className = "lemnity-span12-head";
      head.textContent = "ШИРИНА БЛОКА";

      const box = document.createElement("div");
      box.className = "lemnity-span12-box";

      const bars = document.createElement("div");
      bars.className = "lemnity-span12-bars";
      bars.setAttribute("role", "slider");

      let activeSpan = readSpan(component.getAttributes());
      let dragging = false;

      const segs: HTMLDivElement[] = [];
      for (let col = 1; col <= 12; col += 1) {
        const cell = document.createElement("div");
        cell.className = "lemnity-span12-cell";
        cell.dataset.col = String(col);
        const grip = document.createElement("span");
        grip.className = "lemnity-span12-handle";
        cell.appendChild(grip);
        segs.push(cell);
        bars.appendChild(cell);
      }

      const meter = document.createElement("div");
      meter.className = "lemnity-span12-meter";
      const meterRail = document.createElement("span");
      meterRail.className = "lemnity-span12-meter-rail";
      const meterVal = document.createElement("span");
      meterVal.className = "lemnity-span12-meter-val";
      meter.appendChild(meterRail);
      meter.appendChild(meterVal);

      const segmentIndexFromClient = (cx: number) => {
        const rect = bars.getBoundingClientRect();
        if (!rect.width) return activeSpan;
        const frac = Math.max(0, Math.min(1, (cx - rect.left) / rect.width));
        return Math.max(1, Math.min(12, Math.ceil(frac * 12)));
      };

      const paintVisual = () => {
        meterVal.textContent = String(activeSpan);
        segs.forEach((cell, idx) => {
          const col = idx + 1;
          cell.classList.toggle("lemnity-span12-cell--on", col <= activeSpan);
          const g = cell.querySelector<HTMLElement>(".lemnity-span12-handle");
          if (g) {
            const showGrip = activeSpan >= 1 && (col === 1 || col === activeSpan);
            g.style.opacity = showGrip ? "1" : "0";
          }
        });
      };

      const applySpan = (n: number) => {
        activeSpan = Math.min(12, Math.max(1, n));
        component.addAttributes({ "data-ln-span": String(activeSpan) });
        applyLemnitySectionWidthLayout(component);
        paintVisual();
      };

      const onBarsDown = (ev: PointerEvent) => {
        if (ev.pointerType === "mouse" && ev.buttons !== 1) return;
        dragging = true;
        try {
          bars.setPointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
        applySpan(segmentIndexFromClient(ev.clientX));
      };

      const onBarsMove = (ev: PointerEvent) => {
        if (!dragging) return;
        applySpan(segmentIndexFromClient(ev.clientX));
      };

      const endDrag = (ev: PointerEvent) => {
        dragging = false;
        try {
          bars.releasePointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
      };

      bars.addEventListener("pointerdown", onBarsDown);
      bars.addEventListener("pointermove", onBarsMove);
      bars.addEventListener("pointerup", endDrag);
      bars.addEventListener("pointercancel", endDrag);

      const onAttrs = () => {
        const n = readSpan(component.getAttributes());
        if (n !== activeSpan) {
          activeSpan = n;
          paintVisual();
        }
      };
      component.on?.("change:attributes", onAttrs);

      const mo = new MutationObserver(() => {
        if (!root.isConnected) {
          mo.disconnect();
          bars.removeEventListener("pointerdown", onBarsDown);
          bars.removeEventListener("pointermove", onBarsMove);
          bars.removeEventListener("pointerup", endDrag);
          bars.removeEventListener("pointercancel", endDrag);
          component.off?.("change:attributes", onAttrs);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });

      box.appendChild(bars);
      box.appendChild(meter);
      root.appendChild(head);
      root.appendChild(box);

      paintVisual();

      return root;
    },
  });
}

/** Трейты секции для сетки 12 колонок (служит базой для `lemnity-box-block-settings-traits`). */
export const LEMNITY_GRID_SECTION_BASE_TRAITS: TraitProperties[] = [
  {
    type: "lemnity-span-12",
    name: "data-ln-span",
    label: "Ширина блока (колонок)",
  },
  {
    type: "select",
    name: "data-ln-align",
    label: "Выравнивание контента",
    options: [
      { id: "left", name: "Слева" },
      { id: "center", name: "По центру" },
      { id: "right", name: "Справа" },
    ],
  },
];

function registerSectionType(editor: Editor) {
  editor.DomComponents.addType("lemnity-grid-section", {
    isComponent: (el) => el.tagName === "SECTION",
    extend: "default",
    model: {
      defaults: {
        /** Включает ресайз; конфиг ручек задаётся в `component:resize:init`. */
        resizable: true,
        traits: [...LEMNITY_GRID_SECTION_BASE_TRAITS],
      },
      init(this: Component) {
        this.on("change:attributes", () => applyLemnitySectionWidthLayout(this));
      },
    },
  });
}

/** Сетка на холсте + секции с шириной по 12 колонкам. */
export function attachLemnityBoxSectionWidthGrid(editor: Editor): () => void {
  registerTraitType(editor);
  registerSectionType(editor);

  const onResizeInit = (opts: ResizeInitOpts) => {
    const comp = opts.component;
    if (!comp) return;

    const wrap = editor.getWrapper?.();
    if (wrap && comp === wrap) {
      opts.resizable = false;
      return;
    }

    if (comp.get("resizable") === false) return;

    if (!isDesktopLikeDevice(editor)) {
      opts.resizable = false;
      return;
    }

    const inherit =
      typeof opts.resizable === "object" && opts.resizable !== null && !Array.isArray(opts.resizable)
        ? ({ ...opts.resizable } as Record<string, unknown>)
        : {};

    opts.resizable = {
      ...inherit,
      tl: false,
      tc: false,
      tr: false,
      cl: true,
      cr: true,
      bl: false,
      bc: false,
      br: false,
    };
  };

  const onResizeUpdate = (opts: ResizeUpdateOpts) => {
    const comp = opts.component;
    if (!isLemnityGridSection(comp) || !comp || !opts.updateStyle) return;
    if (!isDesktopLikeDevice(editor)) return;
    const el = opts.el;
    const rect = opts.rect;
    if (!el || !rect || typeof rect.w !== "number") return;

    const parentW = parentContentWidth(el, editor);
    const span = spanFromPixelWidth(rect.w, parentW);
    comp.addAttributes({ "data-ln-span": String(span) });
    applyLemnitySectionWidthLayout(comp);
    const raw = comp.getStyle() as Record<string, unknown>;
    const st: Record<string, string> = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (k === "__p") return;
      if (v !== undefined && v !== null) st[k] = String(v as string | number | boolean);
    });
    opts.updateStyle(st);
  };

  const onBootstrap = () => {
    scheduleLemnityCanvasLayoutRefresh(editor);
  };

  const onFrameLoad = () => {
    scheduleLemnityCanvasLayoutRefresh(editor);
  };

  const onComponentAdd = (model: Component, opts?: { action?: string }) => {
    const act = opts?.action;
    if (
      act &&
      act !== "add-component" &&
      act !== "move-component" &&
      act !== "clone-component"
    ) {
      return;
    }
    ensureSideResizeEnabled(model, editor);
    normalizeNewSection(model);
    applyLemnitySectionWidthLayout(model);
    if (String(model.get("tagName") ?? "").toLowerCase() === "section") {
      model.components()?.forEach((ch: Component) => {
        if (String(ch.get("tagName") ?? "").toLowerCase() === "style") {
          ch.set(
            {
              draggable: false,
              droppable: false,
              copyable: false,
              layerable: false,
              highlightable: false,
            },
            { silent: true } as never,
          );
        }
      });
    }
    scheduleLemnityCanvasLayoutRefresh(editor);
  };

  const onDragEnd = () => {
    scheduleLemnityCanvasLayoutRefresh(editor);
  };

  const onDevice = () => {
    syncBlockGridOverlay(editor);
  };

  editor.on("load", onBootstrap);
  editor.on("device:select", onDevice);
  editor.on("canvas:frame:load", onFrameLoad);
  editor.on("component:add", onComponentAdd);
  editor.on("component:drag:end", onDragEnd);
  editor.on("component:resize:init" as never, onResizeInit as never);
  editor.on("component:resize:update" as never, onResizeUpdate as never);

  return () => {
    editor.off?.("load", onBootstrap);
    editor.off?.("device:select", onDevice);
    editor.off?.("canvas:frame:load", onFrameLoad);
    editor.off?.("component:add", onComponentAdd);
    editor.off?.("component:drag:end", onDragEnd);
    editor.off?.("component:resize:init" as never, onResizeInit as never);
    editor.off?.("component:resize:update" as never, onResizeUpdate as never);

    const doc = editor.Canvas.getDocument();
    doc?.documentElement?.removeAttribute("data-lemnity-grid12");
    doc?.getElementById?.(BLOCK_GRID_DOC_STYLE_ID)?.remove();
  };
}

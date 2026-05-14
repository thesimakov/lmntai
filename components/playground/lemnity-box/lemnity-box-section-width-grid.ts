import type { Component, Editor, TraitProperties } from "grapesjs";
import { ZB_GRID_OVERLAY_STYLE_ID } from "@/lib/zero-block-grid";

/** Стили только в документе iframe редактора. */
export const BLOCK_GRID_DOC_STYLE_ID = "lemnity-block-grid-10-doc";

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

/** Горизонтальные поля сетки редактора (совпадают с пунктиром). Реальная ширина «10 колонок» = 100% − 2×. */
export const LEMNITY_GRID_OUTSIDE_GUTTER_PX = 40;

const CANVAS_GRID_DOC_CSS = `
/* Сетка 10 колонок в полосе контента (отступы по бокам 40px). Секции на всю ширину холста могут визуально
   выходить за колонки; контент внутри удерживается правилами padding на section (см. ниже).
   Математика: 2×20px поля + 10×80px кол + 9×40px зазор = 1200px. Шаг = ровно 10%. */
html[data-lemnity-grid12="on"] body {
  position: relative;
  margin: 0;
  box-sizing: border-box;
}

html[data-lemnity-grid12="on"] body::before {
  content: "";
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 2147482900;
  box-sizing: border-box;
  background-image: linear-gradient(90deg,
    transparent                        1.6667%,
    rgba(251, 113, 133, 0.12)  1.6667%  8.3333%,
    transparent                8.3333%  11.6667%,
    rgba(251, 113, 133, 0.12) 11.6667%  18.3333%,
    transparent               18.3333%  21.6667%,
    rgba(251, 113, 133, 0.12) 21.6667%  28.3333%,
    transparent               28.3333%  31.6667%,
    rgba(251, 113, 133, 0.12) 31.6667%  38.3333%,
    transparent               38.3333%  41.6667%,
    rgba(251, 113, 133, 0.12) 41.6667%  48.3333%,
    transparent               48.3333%  51.6667%,
    rgba(251, 113, 133, 0.12) 51.6667%  58.3333%,
    transparent               58.3333%  61.6667%,
    rgba(251, 113, 133, 0.12) 61.6667%  68.3333%,
    transparent               68.3333%  71.6667%,
    rgba(251, 113, 133, 0.12) 71.6667%  78.3333%,
    transparent               78.3333%  81.6667%,
    rgba(251, 113, 133, 0.12) 81.6667%  88.3333%,
    transparent               88.3333%  91.6667%,
    rgba(251, 113, 133, 0.12) 91.6667%  98.3333%,
    transparent               98.3333%
  );
}

html[data-lemnity-grid12="off"] body::before {
  content: none !important;
  background-image: none !important;
}

html[data-lemnity-grid12="off"] body {
  box-sizing: unset !important;
}

/*
 * Сетка — чисто визуальный оверлей. Секции (и стандартные, и zero-block) не получают принудительный
 * padding — оба типа блоков одинаково занимают полную ширину холста без сужения.
 */
html[data-lemnity-grid12="on"] body > section,
html[data-lemnity-grid12="on"] body > * > section {
  box-sizing: border-box !important;
}

html[data-lemnity-grid12="off"] body > section,
html[data-lemnity-grid12="off"] body > * > section {
  box-sizing: unset !important;
}

/*
 * Пунктир по левому и правому краю полосы 12 колонок.
 */
html[data-lemnity-grid12="on"]::before,
html[data-lemnity-grid12="on"]::after {
  content: "";
  position: fixed;
  top: 0;
  bottom: 0;
  width: 2px;
  pointer-events: none;
  z-index: 2147483000;
  box-sizing: border-box;
  background-repeat: repeat-y;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(15, 15, 15, 0.88) 0 5px,
    transparent 5px 11px
  );
}
html[data-lemnity-grid12="on"]::before {
  left: 1.6667%;
}
html[data-lemnity-grid12="on"]::after {
  right: 1.6667%;
}

/* Zero blocks flow through the unified page grid — body::before (position:fixed) overlays them
   with the same 12-column pink grid as regular sections. No separate per-block overlay needed. */
html[data-lemnity-grid12="on"] .lemnity-zero-block {
  position: relative;
  width: 100% !important;
  max-width: none !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

html[data-lemnity-grid12="off"]::before,
html[data-lemnity-grid12="off"]::after {
  content: none !important;
  background-image: none !important;
}
`;

export function syncBlockGridOverlay(editor: Editor) {
  const doc = editor.Canvas.getDocument();
  const html = doc?.documentElement;
  if (!html) return;
  let tag = doc.getElementById(BLOCK_GRID_DOC_STYLE_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = doc.createElement("style");
    tag.id = BLOCK_GRID_DOC_STYLE_ID;
    doc.head.appendChild(tag);
  }
  tag.textContent = CANVAS_GRID_DOC_CSS;
  html.setAttribute("data-lemnity-grid12", isDesktopLikeDevice(editor) ? "on" : "off");
  // Direct DOM reset for zero-block sections — use !important to beat any stale GrapesJS class rules.
  doc.querySelectorAll<HTMLElement>("section.lemnity-zero-block").forEach((el) => {
    el.style.setProperty("width", "100%", "important");
    el.style.setProperty("max-width", "none", "important");
    el.style.setProperty("margin-left", "0", "important");
    el.style.setProperty("margin-right", "0", "important");
  });
  syncZeroBlockGridOverlays(editor);
}

/** Очищает отдельный оверлей колонок зеро-блоков в главном GrapesJS-канвасе.
 *  Единая модульная сетка обеспечивается через body::before (position:fixed),
 *  которая накрывает весь канвас — включая зеро-блоки — теми же розовыми колонками. */
export function syncZeroBlockGridOverlays(editor: Editor) {
  const doc = editor.Canvas.getDocument();
  if (!doc) return;
  const styleTag = doc.getElementById(ZB_GRID_OVERLAY_STYLE_ID) as HTMLStyleElement | null;
  if (styleTag) styleTag.textContent = "";
}

function readSpan(attrs: Record<string, string>): number {
  const raw = attrs["data-ln-span"];
  const n = parseInt(raw ?? "10", 10);
  if (!Number.isFinite(n)) return 10;
  return Math.min(10, Math.max(1, n));
}

function readAlign(attrs: Record<string, string>): "left" | "center" | "right" {
  const a = attrs["data-ln-align"];
  if (a === "left" || a === "right" || a === "center") return a;
  return "center";
}

const FULL_WIDTH_ATTR = "data-ln-full";

function readFullWidth(attrs: Record<string, string>): boolean {
  return attrs[FULL_WIDTH_ATTR] === "1";
}

function isLemnityGridSection(component: Component | null | undefined): boolean {
  if (!component?.get) return false;
  if (component.get("type") === "lemnity-grid-section") return true;
  return false;
}

function readComponentClasses(component: Component): string[] {
  const cls = component.getClasses?.();
  if (Array.isArray(cls)) return cls.map(String);
  if (typeof cls === "string") return cls.split(/\s+/).filter(Boolean);
  return [];
}

function isZeroBlockSection(component: Component): boolean {
  if (String(component.get?.("tagName") ?? "").toLowerCase() !== "section") return false;
  return readComponentClasses(component).includes("lemnity-zero-block");
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

/** Ширина контентной области элемента (clientWidth − собственные горизонтальные padding). */
function contentBoxInnerWidth(el: HTMLElement | null | undefined): number {
  if (!el) return 1;
  const cw = el.clientWidth;
  const st = getComputedStyle(el);
  const pl = parseFloat(st.paddingLeft) || 0;
  const pr = parseFloat(st.paddingRight) || 0;
  const inner = cw - pl - pr;
  return inner > 0 ? inner : (cw > 0 ? cw : 1);
}

/** Ширина родителя секции (холст), без вычитания боковых 40px: сетка считается как (W − 80px). */
function parentContentWidth(sectionEl: HTMLElement | null | undefined, editor: Editor): number {
  const body = editor.Canvas?.getBody?.() ?? null;
  if (!sectionEl) return contentBoxInnerWidth(body);
  const parent = sectionEl.parentElement;
  if (parent) return contentBoxInnerWidth(parent);
  return contentBoxInnerWidth(body);
}

function spanFromPixelWidth(wPx: number, parentW: number): number {
  const gutter = LEMNITY_GRID_OUTSIDE_GUTTER_PX * 2;
  const gridInner = Math.max(1, parentW - gutter);
  const innerW = Math.max(0, wPx - gutter);
  const n = Math.round((innerW / gridInner) * 10);
  return Math.min(10, Math.max(1, n));
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

  if (isZeroBlockSection(component)) {
    component.removeStyle("max-width");
    component.removeStyle("margin-left");
    component.removeStyle("margin-right");
    component.addStyle({ width: "100%", "box-sizing": "border-box" });
    return;
  }

  const attrs = component.getAttributes();
  const align = readAlign(attrs);

  if (readFullWidth(attrs)) {
    /* «Растянуть на 100%»: явно 100% ширины, без ограничения по колонкам. */
    component.removeStyle("max-width");
    component.addStyle({ width: "100%", "box-sizing": "border-box" });
    if (align === "center") {
      component.addStyle({ "margin-left": "auto", "margin-right": "auto" });
    } else if (align === "right") {
      component.addStyle({ "margin-left": "auto", "margin-right": "0" });
    } else {
      component.addStyle({ "margin-left": "0", "margin-right": "auto" });
    }
    return;
  }

  component.removeStyle("width");

  const span = readSpan(attrs);
  const gutter2 = LEMNITY_GRID_OUTSIDE_GUTTER_PX * 2;

  if (span >= 10) {
    component.removeStyle("max-width");
  } else {
    /* Внешняя коробка может быть шире полосы контента; внутренняя ширина под контент ≈ span/10 от (100% − 80px). */
    component.addStyle({ "max-width": `calc(${span} / 10 * (100% - ${gutter2}px) + ${gutter2}px)` });
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
    syncZeroBlockGridOverlays(editor);
  });
}

function normalizeNewSection(component: Component) {
  if (String(component.get?.("tagName") ?? "").toLowerCase() !== "section") return;
  if (isZeroBlockSection(component)) return;
  const a = component.getAttributes();
  if (a["data-ln-span"] != null || a["data-ln-align"] != null) return;
  component.addAttributes({ "data-ln-span": "10", "data-ln-align": "center", "data-ln-full": "0" }, { silent: true } as never);
}

function registerFullWidthTraitType(editor: Editor) {
  editor.TraitManager.addType("lemnity-full-width", {
    createInput({ component }: { component: Component }) {
      const wrap = document.createElement("label");
      wrap.className = "lemnity-fullwidth-row";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = component.getAttributes()[FULL_WIDTH_ATTR] === "1";

      const text = document.createElement("span");
      text.textContent = "Растянуть на 100% ширины";

      wrap.appendChild(cb);
      wrap.appendChild(text);

      const onChangeCb = () => {
        component.addAttributes({ [FULL_WIDTH_ATTR]: cb.checked ? "1" : "0" });
        applyLemnitySectionWidthLayout(component);
      };
      cb.addEventListener("change", onChangeCb);

      const onAttrs = () => {
        const checked = component.getAttributes()[FULL_WIDTH_ATTR] === "1";
        if (cb.checked !== checked) cb.checked = checked;
      };
      component.on?.("change:attributes", onAttrs);

      const mo = new MutationObserver(() => {
        if (!wrap.isConnected) {
          mo.disconnect();
          cb.removeEventListener("change", onChangeCb);
          component.off?.("change:attributes", onAttrs);
        }
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });

      return wrap;
    },
  });
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
      for (let col = 1; col <= 10; col += 1) {
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
        return Math.max(1, Math.min(10, Math.ceil(frac * 10)));
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
        activeSpan = Math.min(10, Math.max(1, n));
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
    type: "lemnity-full-width",
    name: "data-ln-full",
    label: "На всю ширину (100%)",
  },
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
  registerFullWidthTraitType(editor);
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
      tc: true,
      tr: false,
      cl: true,
      cr: true,
      bl: false,
      bc: true,
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

  const onFrameBodyLoad = () => {
    syncBlockGridOverlay(editor);
  };

  editor.on("load", onBootstrap);
  editor.on("device:select", onDevice);
  editor.on("canvas:frame:load", onFrameLoad);
  editor.on("canvas:frame:load:body" as never, onFrameBodyLoad as never);
  editor.on("component:add", onComponentAdd);
  editor.on("component:drag:end", onDragEnd);
  editor.on("component:resize:init" as never, onResizeInit as never);
  editor.on("component:resize:update" as never, onResizeUpdate as never);

  return () => {
    editor.off?.("load", onBootstrap);
    editor.off?.("device:select", onDevice);
    editor.off?.("canvas:frame:load", onFrameLoad);
    editor.off?.("canvas:frame:load:body" as never, onFrameBodyLoad as never);
    editor.off?.("component:add", onComponentAdd);
    editor.off?.("component:drag:end", onDragEnd);
    editor.off?.("component:resize:init" as never, onResizeInit as never);
    editor.off?.("component:resize:update" as never, onResizeUpdate as never);

    const doc = editor.Canvas.getDocument();
    doc?.documentElement?.removeAttribute("data-lemnity-grid12");
    doc?.getElementById?.(BLOCK_GRID_DOC_STYLE_ID)?.remove();
  };
}

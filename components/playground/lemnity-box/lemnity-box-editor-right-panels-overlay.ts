import type { Editor } from "grapesjs";

const RIGHT_PANELS_COLLAPSED = "lemnity-right-panels-collapsed";
const VIEWS_BUTTONS_DOCKED = "lemnity-box-views-buttons-docked";
const VIEWS_TOOLBAR_DOCK_CLASS = "lemnity-gjs-views-toolbar-dock";
const VIEWS_PANEL_ACTIONS = "lemnity-gjs-views-panel-actions";

function collapseRightPanels(editor: Editor, root: HTMLElement | null, scheduleSync: () => void) {
  root?.classList.add(RIGHT_PANELS_COLLAPSED);
  editor.stopCommand?.("open-sm");
  editor.stopCommand?.("open-tm");
  editor.stopCommand?.("open-layers");
  editor.stopCommand?.("open-blocks");
  scheduleSync();
}

/** Свернуть правые панели (класс/стили) без доступа к overlay — после добавления блока и т.п. */
export function collapseLemnityRightPanelsFromEditor(editor: Editor): void {
  const mount = editor.getContainer?.() as HTMLElement | null | undefined;
  const root = mount?.closest?.(".gjs-editor") as HTMLElement | null;
  if (!root) return;
  root.classList.add(RIGHT_PANELS_COLLAPSED);
  editor.stopCommand?.("open-sm");
  editor.stopCommand?.("open-tm");
  editor.stopCommand?.("open-layers");
  editor.stopCommand?.("open-blocks");
}

function ensureViewsContainerCollapseBar(
  editor: Editor,
  getRoot: () => HTMLElement | null,
  scheduleSync: () => void
) {
  const r = getRoot();
  const c = r?.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views-container");
  if (!c || c.querySelector(`.${VIEWS_PANEL_ACTIONS}`)) return;

  const bar = document.createElement("div");
  bar.className = VIEWS_PANEL_ACTIONS;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "gjs-pn-btn lemnity-gjs-views-panel-close gjs-four-color";
  btn.setAttribute("aria-label", "Свернуть панель");
  btn.setAttribute("title", "Свернуть панель");
  btn.innerHTML =
    '<span class="flex h-8 w-8 items-center justify-center rounded-lg" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></span>';
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    collapseRightPanels(editor, getRoot(), scheduleSync);
  });
  bar.appendChild(btn);
  c.insertBefore(bar, c.firstChild);
}
/** Команды иконок в полоске «виды» — перед запуском раскрываем контент-панель (полоска видна полупрозрачной).
 * Не подписываемся на `open-blocks`: отдельная кнопка «блоки» в полосе устройств только переключает левую панель
 * и не должна разворачивать правый оверлей со Style Manager. */
const VIEW_STRIP_RUN_BEFORE = ["open-sm", "open-tm", "open-layers"] as const;

/**
 * Панели «виды» GrapesJS (иконки + контейнер стилей/слоёв) по умолчанию участвуют в flex и сужают iframe.
 * Переносим их в слой поверх холста, синхронизируем геометрию с canvas; по умолчанию сворачиваем правую колонку.
 */
export function attachLemnityBoxEditorRightPanelsOverlay(
  editor: Editor,
  getMountEl: () => HTMLElement | null
): () => void {
  let raf = 0;
  const mountHost = getMountEl();
  let detachDock: (() => void) | undefined;
  let moCoalesceRaf = 0;

  const getRoot = (): HTMLElement | null => {
    const mount = getMountEl();
    if (!mount) return null;
    return (
      mount.closest(".gjs-editor") ??
      mount.querySelector(".gjs-editor") ??
      mount.parentElement?.querySelector(".gjs-editor") ??
      null
    ) as HTMLElement | null;
  };

  const syncStripAndCanvasGeom = () => {
    const root = getRoot();
    if (!root) return;

    const docked = root.classList.contains(VIEWS_BUTTONS_DOCKED);
    const tabs = root.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views");
    if (docked) {
      root.style.setProperty("--lemnity-gjs-views-strip-w", "0px");
    } else if (!tabs) {
      root.style.setProperty("--lemnity-gjs-views-strip-w", "52px");
    } else {
      const tw = Math.max(Math.round(tabs.getBoundingClientRect().width), 40);
      root.style.setProperty("--lemnity-gjs-views-strip-w", `${tw}px`);
    }

    const canvasEl = root.querySelector<HTMLElement>(".gjs-cv-canvas");
    const editorRect = root.getBoundingClientRect();
    const devicesBar = root.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-devices-c");
    if (devicesBar) {
      const br = devicesBar.getBoundingClientRect();
      const stripTop = Math.max(0, Math.round(br.top - editorRect.top));
      const stripH = Math.max(28, Math.round(br.height));
      root.style.setProperty("--lemnity-gjs-views-strip-top", `${stripTop}px`);
      root.style.setProperty("--lemnity-gjs-views-strip-height", `${stripH}px`);
    } else {
      root.style.removeProperty("--lemnity-gjs-views-strip-top");
      root.style.removeProperty("--lemnity-gjs-views-strip-height");
    }

    if (canvasEl) {
      const cr = canvasEl.getBoundingClientRect();
      const top = Math.max(0, Math.round(cr.top - editorRect.top));
      /* Высота «тела»: от верха холста до низа редактора — одна колонка с iframe */
      const h = Math.max(120, Math.round(editorRect.height - top));
      root.style.setProperty("--lemnity-gjs-right-panels-top", `${top}px`);
      root.style.setProperty("--lemnity-gjs-right-panels-height", `${h}px`);
    } else {
      root.style.setProperty("--lemnity-gjs-right-panels-top", "0px");
      root.style.setProperty("--lemnity-gjs-right-panels-height", "100%");
    }
  };

  const scheduleSync = () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      syncStripAndCanvasGeom();
    });
  };

  /** Старые билды могли вставлять шапку над контентом панели стилей — убираем, чтобы не было лишнего div[0]. */
  const stripStaleViewsPanelChrome = () => {
    const r = getRoot();
    if (!r) return;
    const c = r.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views-container");
    if (!c) return;
    c.querySelector(".lemnity-gjs-views-container-header")?.remove();
    c.classList.remove("lemnity-gjs-views-container-with-header");
    ensureViewsContainerCollapseBar(editor, getRoot, scheduleSync);
  };

  const expandRightPanelsIfCollapsed = () => {
    const r = getRoot();
    if (!r?.classList.contains(RIGHT_PANELS_COLLAPSED)) return;
    r.classList.remove(RIGHT_PANELS_COLLAPSED);
    queueMicrotask(() => {
      scheduleSync();
    });
  };

  const viewStripBeforeHandlers = VIEW_STRIP_RUN_BEFORE.map((cmd) => {
    const ev = `command:run:before:${cmd}` as `command:run:before:${string}`;
    const fn = () => expandRightPanelsIfCollapsed();
    editor.on(ev, fn);
    return () => editor.off(ev, fn);
  });

  const dockViewsButtons = () => {
    const root = getRoot();
    if (!root) return;
    const devicesRow = root.querySelector<HTMLElement>(".gjs-pn-devices-c .gjs-pn-buttons");
    const viewsButtonsHost = root.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views .gjs-pn-buttons");
    if (!devicesRow || !viewsButtonsHost) return;

    // Если док уже создан — не дублируем.
    if (devicesRow.querySelector(`.${VIEWS_TOOLBAR_DOCK_CLASS}`)) return;

    const wrap = document.createElement("div");
    wrap.className = VIEWS_TOOLBAR_DOCK_CLASS;
    while (viewsButtonsHost.firstChild) {
      wrap.appendChild(viewsButtonsHost.firstChild);
    }
    const blocksToggle = devicesRow.querySelector<HTMLElement>(".lemnity-box-blocks-toolbar-btn");
    if (blocksToggle) {
      blocksToggle.insertAdjacentElement("afterend", wrap);
    } else {
      devicesRow.appendChild(wrap);
    }
    root.classList.add(VIEWS_BUTTONS_DOCKED);
    scheduleSync();

    detachDock = () => {
      const r = getRoot();
      const dr = r?.querySelector<HTMLElement>(".gjs-pn-devices-c .gjs-pn-buttons");
      const vb = r?.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views .gjs-pn-buttons");
      const dock = dr?.querySelector<HTMLElement>(`.${VIEWS_TOOLBAR_DOCK_CLASS}`);
      if (dock && vb) {
        while (dock.firstChild) vb.appendChild(dock.firstChild);
        dock.remove();
      }
      r?.classList.remove(VIEWS_BUTTONS_DOCKED);
    };
  };

  const root = getRoot();
  root?.classList.add(RIGHT_PANELS_COLLAPSED);
  mountHost?.classList.remove("lemnity-gjs-views-panel-bottom");
  mountHost?.classList.add("lemnity-right-panels-overlay-ready");

  syncStripAndCanvasGeom();

  stripStaleViewsPanelChrome();
  dockViewsButtons();

  const ro = new ResizeObserver(() => scheduleSync());
  if (root) {
    ro.observe(root);
    root.querySelectorAll<HTMLElement>(".gjs-pn-panel.gjs-pn-views").forEach((el) => ro.observe(el));
    root.querySelectorAll<HTMLElement>(".gjs-cv-canvas").forEach((el) => ro.observe(el));
  }

  const onWindowResize = () => scheduleSync();
  window.addEventListener("resize", onWindowResize);
  const onLoad = () => scheduleSync();
  const onCanvasUpdate = () => scheduleSync();

  editor.on("load", onLoad);
  editor.on("canvas:update", onCanvasUpdate);

  // Grapes может лениво перерисовывать панели после attach — докаем повторно.
  const mo = new MutationObserver(() => {
    /* Десятки тысяч уведомлений подряд: только O(1) и одна постановка rAF на кадр.
     * Счётчики/fetch в этом колбэке ранее блокировали главный поток (зависание «Загрузка редактора»). */
    if (moCoalesceRaf) return;
    moCoalesceRaf = requestAnimationFrame(() => {
      moCoalesceRaf = 0;
      stripStaleViewsPanelChrome();
      dockViewsButtons();
    });
  });
  if (root) {
    const panelsHost = root.querySelector<HTMLElement>(".gjs-pn-panels");
    mo.observe(panelsHost ?? root, { subtree: true, childList: true });
  }

  // Принудительно сворачиваем после завершения текущего тика и после загрузки редактора.
  queueMicrotask(() => {
    const r = getRoot();
    if (!r) return;
    r.classList.add(RIGHT_PANELS_COLLAPSED);
    editor.stopCommand?.("open-sm");
    editor.stopCommand?.("open-tm");
    editor.stopCommand?.("open-layers");
    editor.stopCommand?.("open-blocks");
    scheduleSync();
  });

  const forceCollapsedOnLoad = () => {
    const r = getRoot();
    if (!r) return;
    r.classList.add(RIGHT_PANELS_COLLAPSED);
    editor.stopCommand?.("open-sm");
    editor.stopCommand?.("open-tm");
    editor.stopCommand?.("open-layers");
    editor.stopCommand?.("open-blocks");
    stripStaleViewsPanelChrome();
    dockViewsButtons();
    scheduleSync();
  };
  editor.on("load", forceCollapsedOnLoad);

  return () => {
    viewStripBeforeHandlers.forEach((off) => off());
    detachDock?.();
    mo.disconnect();
    ro.disconnect();
    window.removeEventListener("resize", onWindowResize);
    editor.off("load", onLoad);
    editor.off("load", forceCollapsedOnLoad);
    editor.off("canvas:update", onCanvasUpdate);
    if (moCoalesceRaf) cancelAnimationFrame(moCoalesceRaf);
    if (raf) cancelAnimationFrame(raf);
    mountHost?.classList.remove("lemnity-right-panels-overlay-ready");
    root?.classList.remove(RIGHT_PANELS_COLLAPSED);
    root?.style.removeProperty("--lemnity-gjs-views-strip-w");
    root?.style.removeProperty("--lemnity-gjs-right-panels-top");
    root?.style.removeProperty("--lemnity-gjs-right-panels-height");
    root?.style.removeProperty("--lemnity-gjs-views-strip-top");
    root?.style.removeProperty("--lemnity-gjs-views-strip-height");
  };
}

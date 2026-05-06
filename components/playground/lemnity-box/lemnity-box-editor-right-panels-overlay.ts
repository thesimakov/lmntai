import type { Editor } from "grapesjs";

const RIGHT_PANELS_COLLAPSED = "lemnity-right-panels-collapsed";
const VIEWS_BUTTONS_DOCKED = "lemnity-box-views-buttons-docked";
const VIEWS_TOOLBAR_DOCK_CLASS = "lemnity-gjs-views-toolbar-dock";
const VIEWS_CONTAINER_HEADER_CLASS = "lemnity-gjs-views-container-header";
const VIEWS_CONTAINER_CLOSE_BTN_CLASS = "lemnity-gjs-views-container-close";
const STYLES_DRAWER_CMD = "lemnity-toggle-styles-drawer";
const STYLES_DRAWER_BTN = "lemnity-styles-drawer-toggle";

/** Команды иконок в полоске «виды» — перед запуском раскрываем контент-панель (полоска видна полупрозрачной). */
const VIEW_STRIP_RUN_BEFORE = ["open-sm", "open-tm", "open-layers", "open-blocks"] as const;

/**
 * Панели «виды» GrapesJS (иконки + контейнер стилей/слоёв) по умолчанию участвуют в flex и сужают iframe.
 * Переносим их в слой поверх холста, синхронизируем геометрию с canvas; по умолчанию сворачиваем и открываем кнопкой «Стили» в полосе устройств.
 */
export function attachLemnityBoxEditorRightPanelsOverlay(
  editor: Editor,
  getMountEl: () => HTMLElement | null
): () => void {
  let raf = 0;
  const mountHost = getMountEl();
  let detachDock: (() => void) | undefined;
  let detachHeader: (() => void) | undefined;
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

  const syncStripAndCanvasGeom = (geomReason: string) => {
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

  const scheduleSync = (geomReason = "raf") => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      syncStripAndCanvasGeom(geomReason);
    });
  };

  const resolveCurrentViewsTitle = (root: HTMLElement): string => {
    const stylesToggle = root.querySelector<HTMLElement>(".lemnity-box-styles-toolbar-btn.gjs-pn-active");
    if (stylesToggle) return "Стили";

    const activeBtn =
      root.querySelector<HTMLElement>(`.${VIEWS_TOOLBAR_DOCK_CLASS} .gjs-pn-btn.gjs-pn-active`) ??
      root.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views .gjs-pn-btn.gjs-pn-active");

    const rawTitle =
      activeBtn?.textContent?.trim() ||
      activeBtn?.getAttribute("title") ||
      activeBtn?.getAttribute("aria-label") ||
      activeBtn?.getAttribute("data-gjs-instant-tip") ||
      "";

    if (!rawTitle) return "Стили";
    return rawTitle.replace(/\s+\(.*?\)\s*$/u, "").trim() || "Стили";
  };

  const syncViewsContainerHeaderTitle = () => {
    const root = getRoot();
    if (!root) return;
    const titleEl = root.querySelector<HTMLElement>(".lemnity-gjs-views-container-title");
    if (!titleEl) return;
    const next = resolveCurrentViewsTitle(root);
    /* Идемпотентно: каждое присвоение textContent даёт childList в поддереве .gjs-pn-panels;
     * MutationObserver на панелях тогда будит rAF каждый кадр → «вечный» цикл и нагрузка. */
    if (titleEl.textContent !== next) titleEl.textContent = next;
  };

  const syncStylesDrawerButton = () => {
    const root = getRoot();
    const open = Boolean(root && !root.classList.contains(RIGHT_PANELS_COLLAPSED));
    const syncOpts = { fromListen: true } as never;
    editor.Panels.getButton("devices-c", STYLES_DRAWER_BTN)?.set("active", open, syncOpts);
    syncViewsContainerHeaderTitle();
  };

  const expandRightPanelsIfCollapsed = () => {
    const r = getRoot();
    if (!r?.classList.contains(RIGHT_PANELS_COLLAPSED)) return;
    r.classList.remove(RIGHT_PANELS_COLLAPSED);
    queueMicrotask(() => {
      scheduleSync("expandPanels");
      syncStylesDrawerButton();
    });
  };

  const viewStripBeforeHandlers = VIEW_STRIP_RUN_BEFORE.map((cmd) => {
    const ev = `command:run:before:${cmd}` as `command:run:before:${string}`;
    const fn = () => expandRightPanelsIfCollapsed();
    editor.on(ev, fn);
    return () => editor.off(ev, fn);
  });

  let detachToggle: (() => void) | undefined;

  const mountViewsContainerHeader = () => {
    const root = getRoot();
    if (!root) return;
    const container = root.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views-container");
    if (!container) return;
    if (container.querySelector(`.${VIEWS_CONTAINER_HEADER_CLASS}`)) return;

    const header = document.createElement("div");
    header.className = VIEWS_CONTAINER_HEADER_CLASS;

    const title = document.createElement("div");
    title.className = "lemnity-gjs-views-container-title";
    title.textContent = resolveCurrentViewsTitle(root);

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.className = `gjs-pn-btn ${VIEWS_CONTAINER_CLOSE_BTN_CLASS}`;
    closeBtn.setAttribute("title", "Закрыть панель");
    closeBtn.setAttribute("aria-label", "Закрыть панель");
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", () => {
      const r = getRoot();
      if (!r) return;
      r.classList.add(RIGHT_PANELS_COLLAPSED);
      syncStylesDrawerButton();
      scheduleSync("headerClose");
    });

    header.appendChild(title);
    header.appendChild(closeBtn);
    container.prepend(header);
    container.classList.add("lemnity-gjs-views-container-with-header");
    syncViewsContainerHeaderTitle();

    detachHeader = () => {
      const c = getRoot()?.querySelector<HTMLElement>(".gjs-pn-panel.gjs-pn-views-container");
      c?.querySelector(`.${VIEWS_CONTAINER_HEADER_CLASS}`)?.remove();
      c?.classList.remove("lemnity-gjs-views-container-with-header");
    };
  };

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
    const stylesAnchor = devicesRow.querySelector<HTMLElement>(".lemnity-box-styles-toolbar-btn");
    if (stylesAnchor) {
      stylesAnchor.insertAdjacentElement("afterend", wrap);
    } else {
      devicesRow.appendChild(wrap);
    }
    root.classList.add(VIEWS_BUTTONS_DOCKED);
    scheduleSync("dockViewsToolbar");
    syncViewsContainerHeaderTitle();

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

  const mountStylesDrawerToggle = () => {
    if (editor.Panels.getButton("devices-c", STYLES_DRAWER_BTN)) {
      detachToggle = () => {};
      return;
    }

    editor.Commands.add(STYLES_DRAWER_CMD, {
      run() {
        const root = getRoot();
        if (!root) return;
        if (root.classList.contains(RIGHT_PANELS_COLLAPSED)) {
          root.classList.remove(RIGHT_PANELS_COLLAPSED);
          queueMicrotask(() => {
            editor.stopCommand?.("open-layers");
            editor.stopCommand?.("open-tm");
            editor.runCommand("open-sm");
            const sel = editor.getSelected();
            if (sel) editor.StyleManager?.select?.(sel as never);
            editor.refresh?.();
            scheduleSync("stylesDrawerCmd");
            syncStylesDrawerButton();
          });
        } else {
          root.classList.add(RIGHT_PANELS_COLLAPSED);
          syncStylesDrawerButton();
        }
      },
    });

    const title =
      typeof editor.t === "function"
        ? String(editor.t("panels.buttons.titles.open-sm" as Parameters<typeof editor.t>[0]))
        : "Стили";

    editor.Panels.addButton("devices-c", {
      id: STYLES_DRAWER_BTN,
      className: "gjs-pn-btn lemnity-box-styles-toolbar-btn",
      command: STYLES_DRAWER_CMD,
      label: '<span class="lemnity-box-styles-toolbar-label">Стили</span>',
      attributes: { title },
    });

    const rootEl = getMountEl()?.closest(".gjs-editor") ?? getMountEl();
    const row = rootEl?.querySelector<HTMLElement>(".gjs-pn-devices-c .gjs-pn-buttons");
    const blocksBtn = row?.querySelector<HTMLElement>(".lemnity-box-blocks-toolbar-btn");
    const ours = row?.querySelector<HTMLElement>(".lemnity-box-styles-toolbar-btn");
    if (row && blocksBtn && ours) {
      blocksBtn.insertAdjacentElement("afterend", ours);
    }

    syncStylesDrawerButton();

    detachToggle = () => {
      const Cmd = editor.Commands as unknown as { remove?: (id: string) => void };
      Cmd.remove?.(STYLES_DRAWER_CMD);
      const Pn = editor.Panels as unknown as { removeButton?: (panel: string, id: string) => void };
      Pn.removeButton?.("devices-c", STYLES_DRAWER_BTN);
    };
  };

  const root = getRoot();
  root?.classList.add(RIGHT_PANELS_COLLAPSED);
  mountHost?.classList.add("lemnity-right-panels-overlay-ready");

  syncStripAndCanvasGeom("attachInitial");

  mountStylesDrawerToggle();

  dockViewsButtons();
  mountViewsContainerHeader();

  const ro = new ResizeObserver(() => scheduleSync("resizeObserver"));
  if (root) {
    ro.observe(root);
    root.querySelectorAll<HTMLElement>(".gjs-pn-panel.gjs-pn-views").forEach((el) => ro.observe(el));
    root.querySelectorAll<HTMLElement>(".gjs-cv-canvas").forEach((el) => ro.observe(el));
  }

  const onWindowResize = () => scheduleSync("windowResize");
  window.addEventListener("resize", onWindowResize);
  const onLoad = () => scheduleSync("editorLoad");
  const onCanvasUpdate = () => scheduleSync("canvasUpdate");
  const onRunOpenSm = () => syncViewsContainerHeaderTitle();
  const onRunOpenTm = () => syncViewsContainerHeaderTitle();
  const onRunOpenLayers = () => syncViewsContainerHeaderTitle();
  const onRunOpenBlocks = () => syncViewsContainerHeaderTitle();

  editor.on("load", onLoad);
  editor.on("canvas:update", onCanvasUpdate);
  editor.on("command:run:open-sm", onRunOpenSm);
  editor.on("command:run:open-tm", onRunOpenTm);
  editor.on("command:run:open-layers", onRunOpenLayers);
  editor.on("command:run:open-blocks", onRunOpenBlocks);

  // Grapes может лениво перерисовывать панели после attach — докаем повторно.
  const mo = new MutationObserver(() => {
    /* Десятки тысяч уведомлений подряд: только O(1) и одна постановка rAF на кадр.
     * Счётчики/fetch в этом колбэке ранее блокировали главный поток (зависание «Загрузка редактора»). */
    if (moCoalesceRaf) return;
    moCoalesceRaf = requestAnimationFrame(() => {
      moCoalesceRaf = 0;
      dockViewsButtons();
      mountViewsContainerHeader();
      syncViewsContainerHeaderTitle();
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
    syncStylesDrawerButton();
    scheduleSync("forceCollapsedOnAttach");
  });

  const forceCollapsedOnLoad = () => {
    const r = getRoot();
    if (!r) return;
    r.classList.add(RIGHT_PANELS_COLLAPSED);
    editor.stopCommand?.("open-sm");
    editor.stopCommand?.("open-tm");
    editor.stopCommand?.("open-layers");
    editor.stopCommand?.("open-blocks");
    dockViewsButtons();
    syncStylesDrawerButton();
    scheduleSync("forceCollapsedOnLoad");
  };
  editor.on("load", forceCollapsedOnLoad);

  return () => {
    viewStripBeforeHandlers.forEach((off) => off());
    detachDock?.();
    detachHeader?.();
    detachToggle?.();
    mo.disconnect();
    ro.disconnect();
    window.removeEventListener("resize", onWindowResize);
    editor.off("load", onLoad);
    editor.off("load", forceCollapsedOnLoad);
    editor.off("canvas:update", onCanvasUpdate);
    editor.off("command:run:open-sm", onRunOpenSm);
    editor.off("command:run:open-tm", onRunOpenTm);
    editor.off("command:run:open-layers", onRunOpenLayers);
    editor.off("command:run:open-blocks", onRunOpenBlocks);
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

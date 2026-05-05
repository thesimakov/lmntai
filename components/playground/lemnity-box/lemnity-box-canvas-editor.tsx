"use client";

import type { AssetsCustomData, Component, Editor } from "grapesjs";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type RefObject } from "react";
import { LemnityBoxBlockLibraryFlyout } from "@/components/playground/lemnity-box/lemnity-box-block-library-flyout";
import {
  LemnityBoxImageLibraryModal,
  type LemnityImageLibraryGrapesContext,
} from "@/components/playground/lemnity-box/lemnity-box-image-library-modal";
import { LEMNITY_BOX_BLOCK_LIBRARIES } from "@/components/playground/lemnity-box/lemnity-box-block-registry";
import { applyLemnityBoxInstantPanelTooltips } from "@/components/playground/lemnity-box/lemnity-box-instant-panel-tooltips";
import {
  attachLemnityBoxPreviewModeLabel,
  syncLemnityPreviewModeLabel,
} from "@/components/playground/lemnity-box/lemnity-box-preview-mode-label";
import { registerCoverGalleryStub } from "@/components/playground/lemnity-box/lemnity-box-tilda-cover-blocks";
import { attachTildaInsertZones } from "@/components/playground/lemnity-box/lemnity-box-tilda-insert-zones";
import { attachLemnityBoxBlockSettings } from "@/components/playground/lemnity-box/lemnity-box-block-settings-traits";
import { attachLemnityBoxSectionWidthGrid } from "@/components/playground/lemnity-box/lemnity-box-section-width-grid";
import { attachLemnityBoxCanvasViewportGuides } from "@/components/playground/lemnity-box/lemnity-box-canvas-viewport-guides";
import { attachLemnityBoxLayerActions } from "@/components/playground/lemnity-box/lemnity-box-layer-actions";
import { attachLemnityBoxStyleManagerChoiceDropdowns } from "@/components/playground/lemnity-box/lemnity-box-style-manager-dropdowns";
import { mountPlaygroundBoxDeviceMenu } from "@/components/playground/lemnity-box/lemnity-box-device-dock-menu";
import { registerLemnityBoxToolbarSiblingMoves } from "@/components/playground/lemnity-box/lemnity-box-toolbar-sibling-moves";
import type { BlockNode, JsonStyle, LemnityBoxCanvasContent, PageDocument, ZeroElement } from "@/lib/lemnity-box-editor-schema";
import type { BoxImageLibraryResponse } from "@/lib/box-image-library-types";
import { lemnityBoxEditorMessagesRu } from "@/lib/lemnity-box-locale-ru";
import { attachLemnityCarouselNavToCanvasFrame } from "@/lib/lemnity-carousel-nav-runtime";
import {
  injectLemnityBoxSectionMotionIntoCanvas,
  mergeLemnityBoxSectionMotionCss,
} from "@/lib/lemnity-box-section-motion";
import { PageTransitionBuildLoader } from "@/components/playground/page-transition-build-loader";
import { useI18n } from "@/components/i18n-provider";

import "grapesjs/dist/css/grapes.min.css";

const PRESET_WEBPAGE_BLOCK_RU: Record<string, { label: string; category?: string }> = {
  "link-block": { label: "Блок со ссылкой", category: "Макет" },
  quote: { label: "Цитата", category: "Макет" },
  "text-basic": { label: "Текстовая секция", category: "Макет" },
};

export type LemnityBoxCanvasEditorProps = {
  bootstrapDocument: PageDocument;
  onChange: (content: LemnityBoxCanvasContent) => void;
  onInitError?: () => void;
  /** DOM в шапке: меню вида макета (иконка текущего устройства + всплывающий список). */
  canvasTopDeviceDockRef?: RefObject<HTMLDivElement | null>;
  /** DOM в шапке страницы: сюда переносится панель Grapes «Опции» (outline, превью, fullscreen, код). */
  canvasTopOptionsDockRef?: RefObject<HTMLDivElement | null>;
  /** Управление боковой панелью блоков извне (опционально). Если не задано — только панель GrapesJS и Escape. */
  blocksPanelOpen?: boolean;
  onBlocksPanelOpenChange?: (open: boolean) => void;
};

export type LemnityBoxCanvasEditorHandle = {
  /** Сразу сбрасывает дебаунс и возвращает HTML/CSS для сохранения. */
  flushCanvasSnapshot: () => LemnityBoxCanvasContent | null;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssPropertyName(key: string) {
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

function styleToString(styles: JsonStyle | undefined) {
  if (!styles) return "";

  return Object.entries(styles)
    .filter((entry): entry is [string, string | number] => entry[1] !== undefined && entry[1] !== null && entry[1] !== "")
    .map(([key, value]) => `${cssPropertyName(key)}: ${String(value)}`)
    .join("; ");
}

function prop(block: BlockNode, key: string, fallback = "") {
  const value = block.props[key];
  return typeof value === "string" ? value : fallback;
}

function sectionOpen(sectionStyle: string) {
  return `<section class="lemnity-section"${sectionStyle}`;
}

function blockToHtml(block: BlockNode): string {
  const style = styleToString(block.styles);
  const sectionStyle = style ? ` style="${escapeHtml(style)}"` : "";

  if (block.type === "text") {
    return `${sectionOpen(sectionStyle)}><div>${escapeHtml(prop(block, "text", "Text"))}</div></section>`;
  }

  if (block.type === "cover") {
    return `${sectionOpen(sectionStyle)}><h1>${escapeHtml(prop(block, "title", "Hero title"))}</h1><p>${escapeHtml(prop(block, "subtitle"))}</p><a href="#">${escapeHtml(prop(block, "buttonLabel", "Start"))}</a></section>`;
  }

  if (block.type === "image") {
    return `${sectionOpen(sectionStyle)}><img src="${escapeHtml(prop(block, "src"))}" alt="${escapeHtml(prop(block, "alt"))}" style="max-width: 100%; border-radius: 24px;" /></section>`;
  }

  if (block.type === "gallery") {
    const images = Array.isArray(block.props.images) ? block.props.images.filter((item): item is string => typeof item === "string") : [];
    return `${sectionOpen(sectionStyle)}><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">${images.map((src) => `<img src="${escapeHtml(src)}" alt="" style="width: 100%; border-radius: 20px;" />`).join("")}</div></section>`;
  }

  if (block.type === "button") {
    return `${sectionOpen(sectionStyle)}><a href="${escapeHtml(prop(block, "href", "#"))}">${escapeHtml(prop(block, "label", "Button"))}</a></section>`;
  }

  if (block.type === "form") {
    return `${sectionOpen(sectionStyle)}><form method="post" action="#"><h2>${escapeHtml(prop(block, "title", "Form"))}</h2><input name="name" placeholder="Имя" /><input name="email" type="email" placeholder="Email" /><button type="submit">${escapeHtml(prop(block, "buttonLabel", "Отправить"))}</button></form></section>`;
  }

  if (block.type === "columns") {
    return `${sectionOpen(sectionStyle)}><div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;"><div>${escapeHtml(prop(block, "left"))}</div><div>${escapeHtml(prop(block, "right"))}</div></div></section>`;
  }

  if (block.type === "zeroBlock") {
    const elements = Array.isArray(block.props.elements) ? (block.props.elements as ZeroElement[]) : [];
    return `${sectionOpen(sectionStyle)}>${elements
      .map((element) => {
        const elementStyle = styleToString(element.styles);
        const styleAttr = elementStyle ? ` style="${escapeHtml(elementStyle)}"` : "";
        if (element.type === "image") {
          return `<img src="${escapeHtml(element.props.src ?? "")}" alt=""${styleAttr} />`;
        }
        if (element.type === "button") {
          return `<button type="button"${styleAttr}>${escapeHtml(element.props.label ?? "Button")}</button>`;
        }
        return `<div${styleAttr}>${escapeHtml(element.props.text ?? "")}</div>`;
      })
      .join("")}</section>`;
  }

  return "";
}

function createStarterContent(document: PageDocument): LemnityBoxCanvasContent {
  const blocks = document.blocks.map(blockToHtml).join("");

  const baseCss = `
body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; }
section { padding: 64px 32px; }
.hero { min-height: 520px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; background: #eef2ff; }
.hero h1 { margin: 0; font-size: 56px; line-height: 1; }
.hero p { max-width: 680px; margin: 24px auto; font-size: 20px; color: #475569; }
a, button { display: inline-flex; border: 0; border-radius: 999px; background: #0f172a; color: white; padding: 12px 22px; text-decoration: none; font-weight: 700; }
input { display: block; width: 100%; margin: 12px 0; padding: 12px 14px; border: 1px solid #cbd5e1; border-radius: 12px; }
`;

  return {
    html:
      blocks ||
      `<section class="hero lemnity-section"><h1>${escapeHtml(document.title)}</h1><p>Соберите страницу в Lemnity Box: перетаскивайте блоки, меняйте стили и сохраняйте результат.</p><a href="#">Начать</a></section>`,
    css: mergeLemnityBoxSectionMotionCss(baseCss),
  };
}

/** Если экспорт редактора сильно короче импортированного бандла (парсер/фильтрация), не теряем CSS шаблона при сохранении. */
function buildPersistedCanvasCss(seedCss: string, editorCss: string): string {
  const n = seedCss.length;
  const m = editorCss.length;
  if (n < 8000) return editorCss;
  if (m >= n * 0.85) return editorCss;
  return `${seedCss}\n/* —gjs-export— */\n${editorCss}`;
}

export const LemnityBoxCanvasEditor = forwardRef<LemnityBoxCanvasEditorHandle, LemnityBoxCanvasEditorProps>(function LemnityBoxCanvasEditor(
  {
    bootstrapDocument,
    onChange,
    onInitError,
    canvasTopDeviceDockRef,
    canvasTopOptionsDockRef,
    blocksPanelOpen: blocksPanelOpenProp,
    onBlocksPanelOpenChange,
  },
  ref
) {
  const { t, lang } = useI18n();
  const tRef = useRef(t);
  tRef.current = t;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const blocksAsideRef = useRef<HTMLElement | null>(null);
  const detachBlocksAsideInsetRef = useRef<(() => void) | null>(null);
  const blocksRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<Editor | null>(null);
  const syncTimerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const onInitErrorRef = useRef(onInitError);
  const initialContentRef = useRef<LemnityBoxCanvasContent | null>(bootstrapDocument.grapesjs ?? null);
  const starterContentRef = useRef<LemnityBoxCanvasContent>(createStarterContent(bootstrapDocument));
  const [libraryBlockId, setLibraryBlockId] = useState<string | null>(null);
  const [assetLibraryCtx, setAssetLibraryCtx] = useState<LemnityImageLibraryGrapesContext | null>(null);
  const [canvasBooting, setCanvasBooting] = useState(true);
  const isBlocksPanelControlled = typeof onBlocksPanelOpenChange === "function";
  const [blocksPanelInternal, setBlocksPanelInternal] = useState(true);
  const blocksPanelOpen = isBlocksPanelControlled ? Boolean(blocksPanelOpenProp) : blocksPanelInternal;
  const setBlocksPanelOpen = useCallback(
    (next: boolean) => {
      if (isBlocksPanelControlled) {
        onBlocksPanelOpenChange?.(next);
      } else {
        setBlocksPanelInternal(next);
      }
    },
    [isBlocksPanelControlled, onBlocksPanelOpenChange]
  );
  const setBlocksPanelOpenRef = useRef(setBlocksPanelOpen);
  const blocksPanelOpenRef = useRef(blocksPanelOpen);
  const openBlockLibraryRef = useRef<(id: string | null) => void>(() => {});
  const pendingWrapperInsertIdxRef = useRef<number | null>(null);
  const tildaDetachRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    openBlockLibraryRef.current = setLibraryBlockId;
  }, []);

  useEffect(() => {
    setBlocksPanelOpenRef.current = setBlocksPanelOpen;
  });

  useEffect(() => {
    blocksPanelOpenRef.current = blocksPanelOpen;
  }, [blocksPanelOpen]);

  /** Подсветка кнопок «Блоки» / «Страницы» в панелях GrapesJS.
   * Важно: `set('active', …)` без `{ fromListen: true }` снова запускает `command` и ломает toggle панели (GrapesJS Panel ButtonView).
   * Третий аргумент через `never`: официальный SetOptions не описывает `fromListen`. */
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const syncOpts = { fromListen: true } as never;
    editor.Panels.getButton("views", "open-blocks")?.set("active", blocksPanelOpen, syncOpts);
    editor.Panels.getButton("devices-c", "lemnity-blocks-toggle")?.set("active", blocksPanelOpen, syncOpts);
  }, [blocksPanelOpen]);

  const getEditor = useCallback(() => editorRef.current, []);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onInitErrorRef.current = onInitError;
  }, [onInitError]);

  useImperativeHandle(ref, () => ({
    flushCanvasSnapshot: () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
        syncTimerRef.current = null;
      }
      const ed = editorRef.current;
      if (!ed) return null;
      const seed = initialContentRef.current ?? starterContentRef.current;
      const editorCss = ed.getCss({ keepUnusedStyles: true }) ?? "";
      const css = buildPersistedCanvasCss(mergeLemnityBoxSectionMotionCss(seed.css), editorCss);
      return { html: ed.getHtml(), css };
    }
  }));

  useEffect(() => {
    if (!blocksPanelOpen) {
      setLibraryBlockId(null);
      pendingWrapperInsertIdxRef.current = null;
    }
  }, [blocksPanelOpen]);

  useEffect(() => {
    if (!blocksPanelOpen) return;
    function onKey(ev: KeyboardEvent) {
      if (ev.key !== "Escape") return;
      if (libraryBlockId) return;
      setBlocksPanelOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [blocksPanelOpen, libraryBlockId, setBlocksPanelOpen]);

  useEffect(() => {
    let mounted = true;
    let detachViewportGuides: (() => void) | undefined;
    let detachSectionWidthGrid: (() => void) | undefined;
    let detachBlockSettings: (() => void) | undefined;
    let detachLayerActions: (() => void) | undefined;
    let detachDeviceDock: (() => void) | undefined;

    async function initEditor() {
      if (!containerRef.current || !blocksRef.current || editorRef.current) return;
      try {
        const [{ default: grapesjs }, { default: presetWebpage }, { default: basicBlocks }] = await Promise.all([
          import("grapesjs"),
          import("grapesjs-preset-webpage"),
          import("grapesjs-blocks-basic"),
        ]);
        if (!mounted || !containerRef.current || !blocksRef.current) return;

        const rawInitial = initialContentRef.current ?? starterContentRef.current;
        const initialContent: LemnityBoxCanvasContent = {
          html: rawInitial.html,
          css: mergeLemnityBoxSectionMotionCss(rawInitial.css),
        };
        const editor = grapesjs.init({
          container: containerRef.current,
          height: "100%",
          keepUnusedStyles: true,
          storageManager: false,
          fromElement: false,
          layerManager: {
            sortable: true,
          },
          i18n: {
            locale: "ru",
            localeFallback: "en",
            detectLocale: false,
            messages: { ru: lemnityBoxEditorMessagesRu },
          },
          blockManager: {
            appendTo: blocksRef.current,
            appendOnClick: true,
          },
          assetManager: {
            embedAsBase64: false,
            autoAdd: true,
            custom: {
              open: (data: AssetsCustomData) => {
                setAssetLibraryCtx({
                  close: () => data.close(),
                  select: (asset, complete) => data.select(asset as never, complete),
                });
              },
              close: () => {
                setAssetLibraryCtx(null);
              },
            },
          },
          plugins: [
            (ed: Editor) =>
              presetWebpage(ed, {
                modalImportTitle: "Импорт HTML",
                modalImportButton: "Импортировать",
                modalImportLabel: "Вставьте ниже HTML/CSS страницы или её фрагмент.",
                textCleanCanvas: "Очистить холст? Все содержимое будет удалено.",
                block: (blockId: string) => PRESET_WEBPAGE_BLOCK_RU[blockId] ?? {},
              }),
            (ed: Editor) =>
              basicBlocks(ed, {
                flexGrid: true,
                category: "Макет",
                labelColumn1: "1 колонка",
                labelColumn2: "2 колонки",
                labelColumn3: "3 колонки",
                labelColumn37: "2 колонки 3/7",
                labelText: "Текст",
                labelLink: "Ссылка",
                labelImage: "Изображение",
                labelVideo: "Видео",
                labelMap: "Карта",
                blocks: ["column1", "column2", "column3", "column3-7", "text", "link", "image", "video", "map"],
              }),
          ],
          components: initialContent.html,
          style: initialContent.css,
        });

        attachLemnityBoxStyleManagerChoiceDropdowns(editor);

        registerLemnityBoxToolbarSiblingMoves(editor);
        detachViewportGuides = attachLemnityBoxCanvasViewportGuides(editor);
        detachSectionWidthGrid = attachLemnityBoxSectionWidthGrid(editor);
        detachBlockSettings = attachLemnityBoxBlockSettings(editor);
        detachLayerActions = attachLemnityBoxLayerActions(editor);

        editor.on(
          "component:add",
          (model: Component, opts?: { action?: string }) => {
            const act = opts?.action;
            if (act && act !== "add-component" && act !== "move-component" && act !== "clone-component") {
              return;
            }
            const wrap = editor.getWrapper();
            if (wrap && model.parent() === wrap) {
              const tag = String(model.get("tagName") ?? "").toLowerCase();
              if (tag === "section") {
                const cls = model.getClasses?.();
                const list: string[] = Array.isArray(cls)
                  ? cls.map(String)
                  : typeof cls === "string"
                    ? cls.split(/\s+/).filter(Boolean)
                    : [];
                if (!list.includes("lemnity-section")) {
                  model.addClass("lemnity-section");
                }
              }
            }

            const pending = pendingWrapperInsertIdxRef.current;
            if (pending == null) return;
            if (!wrap || model.parent() !== wrap) return;

            pendingWrapperInsertIdxRef.current = null;

            queueMicrotask(() => {
              const len = wrap.components().length;
              const clamped = Math.min(Math.max(0, pending), Math.max(0, len - 1));
              if (typeof model.index === "function" && model.index() !== clamped && typeof model.move === "function") {
                model.move(wrap, { at: clamped });
              }
            });
          },
        );

        editor.Commands.add("open-blocks", {
          run() {
            const next = !blocksPanelOpenRef.current;
            setBlocksPanelOpenRef.current(next);
          },
        });

        registerCoverGalleryStub(editor);

        editor.BlockManager.add("text-section", {
          label: "Текстовая секция",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Заголовок секции</h2><p>Добавьте текст и настройте стили справа.</p></section>`,
        });
        editor.BlockManager.add("image", {
          label: "Изображение",
          category: "Медиа",
          content: `<img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72" alt="" style="max-width: 100%; border-radius: 24px;" />`,
        });
        editor.BlockManager.add("lemnity-header", {
          label: "Шапка и меню",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Шапка и меню</h2><p>Клик — выберите вариант навигации в панели справа.</p></section>`,
        });
        editor.BlockManager.add("landing-hero", {
          label: "Главный экран",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Главный экран</h2><p>Клик — варианты в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-shop", {
          label: "Магазин",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Магазин</h2><p>Клик — блоки витрины в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-list", {
          label: "Список",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Список</h2><p>Клик — макеты списков и блоков в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-forms", {
          label: "Формы",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Формы</h2><p>Клик — выберите шаблон формы в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-about", {
          label: "О нас",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>О нас</h2><p>Клик — выберите макет блока «О нас» в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-buttons", {
          label: "Кнопка",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Кнопка</h2><p>Клик — выберите вариант кнопок и CTA в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-contacts", {
          label: "Контакты",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Контакты</h2><p>Клик — выберите макет блока контактов в панели справа.</p></section>`,
        });

        for (const key of Object.keys(LEMNITY_BOX_BLOCK_LIBRARIES)) {
          const block = editor.BlockManager.get(key);
          if (!block) continue;
          block.set("onClick", () => {
            openBlockLibraryRef.current(key);
          });
        }

        const syncContent = () => {
          if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
          syncTimerRef.current = window.setTimeout(() => {
            const editorCss = editor.getCss({ keepUnusedStyles: true }) ?? "";
            const css = buildPersistedCanvasCss(initialContent.css, editorCss);
            onChangeRef.current({ html: editor.getHtml(), css });
          }, 600);
        };

        editor.on("update", syncContent);

        const attachCarouselNavToIframe = () =>
          attachLemnityCarouselNavToCanvasFrame(editor.Canvas.getFrameEl()?.contentWindow ?? undefined);

        editor.on("canvas:frame:load:body", (payload: unknown) => {
          const frameWin = (payload as { window?: Window })?.window;
          const win = frameWin ?? editor.Canvas.getFrameEl()?.contentWindow ?? undefined;
          injectLemnityBoxSectionMotionIntoCanvas(win);
          attachLemnityCarouselNavToCanvasFrame(win);
        });

        const wireInstantTooltips = () => applyLemnityBoxInstantPanelTooltips(editor, containerRef.current);

        const mountLemnityBlocksToolbarButton = () => {
          const devicesPanel = editor.Panels.getPanel("devices-c");
          if (!devicesPanel || editor.Panels.getButton("devices-c", "lemnity-blocks-toggle")) return;
          editor.Panels.addButton("devices-c", {
            id: "lemnity-blocks-toggle",
            className: "gjs-pn-btn lemnity-box-blocks-toolbar-btn",
            command: "open-blocks",
            label: '<span class="lemnity-box-blocks-toolbar-label">Блоки</span>',
            attributes: {
              title: String(editor.t("panels.buttons.titles.lemnity-blocks-toolbar")),
            },
            togglable: true,
            active: blocksPanelOpenRef.current,
          });
          const rootEl = containerRef.current?.closest(".gjs-editor") ?? containerRef.current;
          const row = rootEl?.querySelector<HTMLElement>(".gjs-pn-devices-c .gjs-pn-buttons");
          const ours = row?.querySelector<HTMLElement>(".lemnity-box-blocks-toolbar-btn");
          if (row && ours) {
            row.prepend(ours);
          }
        };

        const mountCanvasDeviceDock = () => {
          const dock = canvasTopDeviceDockRef?.current;
          const editorMount = containerRef.current?.closest(".gjs-editor") ?? containerRef.current;
          if (!dock || !editorMount) return;

          detachDeviceDock?.();
          detachDeviceDock = undefined;

          editorMount
            .querySelectorAll<HTMLElement>(".gjs-pn-devices-c .gjs-pn-buttons .gjs-pn-btn:not(.lemnity-box-blocks-toolbar-btn)")
            .forEach((btn) => btn.style.setProperty("display", "none"));

          detachDeviceDock = mountPlaygroundBoxDeviceMenu(dock, editor, editorMount);
          applyLemnityBoxInstantPanelTooltips(editor, dock);
        };

        const mountCanvasOptionsPanelDock = () => {
          const dock = canvasTopOptionsDockRef?.current;
          const editorMount = containerRef.current?.closest(".gjs-editor") ?? containerRef.current;
          if (!dock || !editorMount) return;

          const freshButtons = editorMount.querySelector<HTMLElement>(".gjs-pn-options .gjs-pn-buttons");
          if (!freshButtons) return;
          dock.querySelectorAll(":scope > .gjs-pn-buttons").forEach((el) => el.remove());
          dock.appendChild(freshButtons);

          editorMount.querySelector<HTMLElement>(".gjs-pn-options")?.style.setProperty("display", "none");
          applyLemnityBoxInstantPanelTooltips(editor, dock);
          attachLemnityBoxPreviewModeLabel(editor, dock, () => ({
            idle: tRef.current("playground_box_preview_mode_view"),
            active: tRef.current("playground_box_preview_mode_edit"),
          }));
        };

        const attachBlocksAsideInset = (edInstance: Editor): (() => void) => {
          const parent = overlayRef.current;
          const aside = blocksAsideRef.current;
          if (!parent || !aside) return () => {};

          let syncRaf = 0;
          const scheduleSync = () => {
            if (syncRaf) return;
            syncRaf = requestAnimationFrame(() => {
              syncRaf = 0;
              sync();
            });
          };

          const sync = () => {
            if (!mounted) return;
            const ed = containerRef.current?.closest(".gjs-editor");
            const canvasEl = ed?.querySelector<HTMLElement>(".gjs-cv-canvas");
            const pr = parent.getBoundingClientRect();

            if (!canvasEl) {
              aside.style.top = "0px";
              aside.style.bottom = "0px";
              aside.style.removeProperty("height");
              return;
            }

            const cr = canvasEl.getBoundingClientRect();
            const top = Math.round(cr.top - pr.top);
            const bottomInset = Math.round(pr.bottom - cr.bottom);
            aside.style.top = `${Math.max(0, top)}px`;
            aside.style.bottom = `${Math.max(0, bottomInset)}px`;
            aside.style.removeProperty("height");
          };

          sync();
          const ro = new ResizeObserver(() => scheduleSync());
          const ed = containerRef.current?.closest(".gjs-editor");
          const canvasEl = ed?.querySelector<HTMLElement>(".gjs-cv-canvas");
          if (canvasEl) ro.observe(canvasEl);
          ro.observe(parent);
          window.addEventListener("resize", scheduleSync);
          edInstance.on("canvas:update", scheduleSync);

          return () => {
            ro.disconnect();
            window.removeEventListener("resize", scheduleSync);
            edInstance.off("canvas:update", scheduleSync);
            if (syncRaf) cancelAnimationFrame(syncRaf);
            aside.style.removeProperty("top");
            aside.style.removeProperty("bottom");
          };
        };

        editor.on("load", () => {
          mountLemnityBlocksToolbarButton();
          detachBlocksAsideInsetRef.current?.();
          detachBlocksAsideInsetRef.current = null;
          requestAnimationFrame(() => {
            if (mounted) setCanvasBooting(false);
            mountCanvasDeviceDock();
            mountCanvasOptionsPanelDock();
            attachCarouselNavToIframe();
            injectLemnityBoxSectionMotionIntoCanvas(editor.Canvas.getFrameEl()?.contentWindow ?? undefined);
            wireInstantTooltips();
            const bmCats = editor.BlockManager.getCategories() as unknown as {
              models?: Array<{ set(k: string, v: unknown): void }>;
            };
            bmCats.models?.forEach((cat) => cat.set("open", false));

            detachBlocksAsideInsetRef.current = attachBlocksAsideInset(editor);
            void fetch("/api/box-image-library?mode=seed")
              .then((r) => r.json())
              .then((body: BoxImageLibraryResponse) => {
                const list = Array.isArray(body.results) ? body.results : [];
                const am = editor.AssetManager;
                list.slice(0, 36).forEach((hit) => {
                  const src = hit.full?.trim();
                  if (!src || am.get(src)) return;
                  am.add({ src, name: hit.alt });
                });
              })
              .catch(() => {});
            const syncOpts = { fromListen: true } as never;
            editor.Panels.getButton("views", "open-blocks")?.set("active", blocksPanelOpenRef.current, syncOpts);
            editor.Panels.getButton("devices-c", "lemnity-blocks-toggle")?.set("active", blocksPanelOpenRef.current, syncOpts);
            syncContent();
          });
        });

        tildaDetachRef.current?.();
        tildaDetachRef.current = attachTildaInsertZones(editor, {
          onRequestBlockPicker(insertAtIndex) {
            pendingWrapperInsertIdxRef.current = insertAtIndex;
            setBlocksPanelOpenRef.current(true);
          },
        });

        editorRef.current = editor;
      } catch {
        if (mounted) setCanvasBooting(false);
        if (mounted) onInitErrorRef.current?.();
      }
    }

    void initEditor();

    return () => {
      mounted = false;
      detachBlocksAsideInsetRef.current?.();
      detachBlocksAsideInsetRef.current = null;
      detachDeviceDock?.();
      detachDeviceDock = undefined;
      detachViewportGuides?.();
      detachSectionWidthGrid?.();
      detachBlockSettings?.();
      detachLayerActions?.();
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
      tildaDetachRef.current?.();
      tildaDetachRef.current = null;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Grapes mount-once; dock refs optional and stable object identity
  }, []);

  useEffect(() => {
    syncLemnityPreviewModeLabel(editorRef.current);
  }, [lang, t]);

  return (
    <div ref={overlayRef} className="relative flex h-full min-h-[280px] min-w-0 w-full flex-1 overflow-hidden bg-slate-100">
      {canvasBooting ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-5 bg-background/96 px-4 backdrop-blur-sm"
        >
          <span className="text-sm font-medium text-muted-foreground">Загрузка редактора…</span>
          <div className="relative h-[min(68vh,520px)] w-full max-w-5xl overflow-hidden rounded-2xl border border-border/30 shadow-sm ring-1 ring-black/[0.04] dark:ring-white/[0.06]">
            <PageTransitionBuildLoader className="h-full min-h-[min(56vh,440px)] w-full" />
          </div>
        </div>
      ) : null}
      <div ref={containerRef} className="relative z-0 h-full min-h-[240px] min-w-0 flex-1" />
      <aside
        ref={blocksAsideRef}
        className={`lemnity-box-block-panel tilda-block-panel absolute bottom-0 left-0 z-30 flex min-h-0 w-[227px] flex-col overflow-hidden border-r border-[#eeeeee] bg-white text-[#0f172a] shadow-[4px_0_24px_rgba(15,23,42,0.12)] transition-transform duration-200 ease-out ${
          blocksPanelOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        }`}
        aria-hidden={!blocksPanelOpen}
      >
        <div className="sticky top-0 z-[1] flex shrink-0 items-center gap-2 border-b border-[#eeeeee] bg-white px-4 py-3 pl-6">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wide text-violet-600/90 dark:text-violet-300/90">
              {t("playground_box_brand")}
            </p>
            <p className="mt-0.5 text-[13px] font-bold tracking-tight text-[#0f172a]">{t("playground_box_blocks")}</p>
          </div>
          <button
            type="button"
            className="flex size-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent font-semibold text-[#475569] transition hover:bg-[#f0f0f0] hover:text-[#0f172a]"
            aria-label="Свернуть панель блоков"
            onClick={() => setBlocksPanelOpen(false)}
          >
            <span className="text-lg leading-none" aria-hidden>
              ‹
            </span>
          </button>
        </div>
        <div ref={blocksRef} className="gjs-blocks-mount min-h-0 flex-1 overflow-y-auto" />
      </aside>
      {libraryBlockId ? (
        <LemnityBoxBlockLibraryFlyout
          blockId={libraryBlockId}
          getEditor={getEditor}
          onClose={() => setLibraryBlockId(null)}
          blocksPanelVisible={blocksPanelOpen}
          consumePendingInsertIndex={() => {
            const idx = pendingWrapperInsertIdxRef.current;
            pendingWrapperInsertIdxRef.current = null;
            return idx;
          }}
        />
      ) : null}
      <LemnityBoxImageLibraryModal context={assetLibraryCtx} getEditor={getEditor} />
    </div>
  );
});

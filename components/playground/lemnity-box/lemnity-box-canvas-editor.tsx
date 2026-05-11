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
import { attachTildaInsertZones } from "@/components/playground/lemnity-box/lemnity-box-tilda-insert-zones";
import { attachLemnityBoxBlockSettings } from "@/components/playground/lemnity-box/lemnity-box-block-settings-traits";
import { attachLemnityBoxElementQuickTraits } from "@/components/playground/lemnity-box/lemnity-box-element-quick-traits";
import { attachLemnityBoxComponentScopedStyles } from "@/components/playground/lemnity-box/lemnity-box-component-scoped-styles";
import { attachLemnityBoxAnchorComponent } from "@/components/playground/lemnity-box/lemnity-box-anchor-component";
import { attachLemnityBoxHtmlEmbed } from "@/components/playground/lemnity-box/lemnity-box-html-embed-component";
import { attachLemnityBoxSectionWidthGrid, syncZeroBlockGridOverlays } from "@/components/playground/lemnity-box/lemnity-box-section-width-grid";
import {
  readZbGridConfig,
  zbGridConfigToAttrs,
  ZB_GRID_DEFAULTS,
  snapXToZbGrid,
  snapYToZbGrid,
  pxToColSpan,
  colSpanToPx,
  writePageGridToDoc,
  resolveZbGridConfig,
  readPageGridFromDoc,
} from "@/lib/zero-block-grid";
import { attachLemnityBoxCanvasViewportGuides } from "@/components/playground/lemnity-box/lemnity-box-canvas-viewport-guides";
import { attachLemnityBoxLayerActions } from "@/components/playground/lemnity-box/lemnity-box-layer-actions";
import { attachLemnityBoxEditorRightPanelsOverlay, collapseLemnityRightPanelsFromEditor } from "@/components/playground/lemnity-box/lemnity-box-editor-right-panels-overlay";
import { attachLemnityBoxStyleManagerChoiceDropdowns } from "@/components/playground/lemnity-box/lemnity-box-style-manager-dropdowns";
import { mountPlaygroundBoxDeviceMenu } from "@/components/playground/lemnity-box/lemnity-box-device-dock-menu";
import { registerLemnityBoxToolbarSiblingMoves } from "@/components/playground/lemnity-box/lemnity-box-toolbar-sibling-moves";
import { registerLemnityBoxBlockSettingsToolbar } from "@/components/playground/lemnity-box/lemnity-box-toolbar-block-settings-modal";
import { PAGE_GRID_DEFAULTS } from "@/lib/lemnity-box-editor-schema";
import type { BlockNode, JsonStyle, LemnityBoxCanvasContent, PageDocument, ZeroElement } from "@/lib/lemnity-box-editor-schema";
import type { BoxImageLibraryResponse } from "@/lib/box-image-library-types";
import { lemnityBoxEditorMessagesRu } from "@/lib/lemnity-box-locale-ru";
import { attachLemnityAnchorsToCanvasFrame } from "@/lib/lemnity-anchor-runtime";
import { attachLemnityCarouselNavToCanvasFrame } from "@/lib/lemnity-carousel-nav-runtime";
import { attachLemnityDetailsTabsToCanvasFrame } from "@/lib/lemnity-details-tabs-runtime";
import {
  injectLemnityBoxSectionMotionIntoCanvas,
  mergeLemnityBoxSectionMotionCss,
} from "@/lib/lemnity-box-section-motion";
import { PageTransitionBuildLoader } from "@/components/playground/page-transition-build-loader";
import { useI18n } from "@/components/i18n-provider";
import {
  ZERO_BLOCK_BASE_TOP_PX,
  ZERO_BLOCK_STEP_Y_PX,
  ZERO_BLOCK_BASE_LEFT_PX,
  ZERO_BLOCK_STEP_X_PX,
  ZERO_BLOCK_COLUMNS,
} from "@/lib/editor-constants";

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
  /** Вызывается когда пользователь хочет открыть нулевой блок в выделенной странице редактора. */
  onOpenZeroBlockEditor?: (blockId: string) => void;
  /** Автоматически активирует режим редактирования первого нулевого блока после загрузки холста. */
  autoActivateZeroBlock?: boolean;
  /** UI нулевого блока в iframe: minimal — только «Редактировать», без нижней панели и «+». По умолчанию minimal, кроме autoActivateZeroBlock. */
  zeroBlockCanvasUi?: "minimal" | "full";
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

const ZERO_BLOCK_RUNTIME_STYLE_ID = "lemnity-zero-block-runtime-style";
const ZERO_BLOCK_SETTINGS_COMMAND = "lemnity-zero-block-open-settings-window";
const ZERO_BLOCK_RESIZE_HANDLES = {
  tl: true,
  tc: true,
  tr: true,
  cl: true,
  cr: true,
  bl: true,
  bc: true,
  br: true,
} as const;
type ZeroBlockInsertKind =
  | "text"
  | "image"
  | "shape"
  | "button"
  | "video"
  | "html"
  | "tooltip"
  | "form"
  | "gallery"
  | "vector";

type ZeroBlockCanvasInlineUi = "minimal" | "full";

const ZERO_BLOCK_RUNTIME_CSS_MINIMAL = `
html[data-ln-zero-inline="minimal"] .lemnity-zero-block:not([data-ln-zero-editing="1"]) [data-ln-zero-save]{display:none!important}
html[data-ln-zero-inline="minimal"] .lemnity-zero-block[data-ln-zero-editing="1"] [data-ln-zero-save]{display:flex!important}
html[data-ln-zero-inline="minimal"] .lemnity-zero-block [data-ln-zero-ui="menu"],
html[data-ln-zero-inline="minimal"] .lemnity-zero-block [data-ln-zero-ui="picker"],
html[data-ln-zero-inline="minimal"] .lemnity-zero-block [data-ln-zero-ui="toolbar-bottom"]{display:none!important}
html[data-ln-zero-inline="minimal"] .lemnity-zero-block [data-ln-zero-ui="toolbar"]{opacity:0;pointer-events:none;transition:opacity 0.18s}
html[data-ln-zero-inline="minimal"] .lemnity-zero-block:hover [data-ln-zero-ui="toolbar"]{opacity:1;pointer-events:auto}
html[data-ln-zero-inline="minimal"] .lemnity-zero-block [data-ln-zero-open-editor]{pointer-events:auto;cursor:pointer;opacity:1}
html[data-ln-zero-inline="minimal"] .lemnity-zero-block [data-ln-zero-open-editor][data-loading]{opacity:0.65;pointer-events:none;cursor:default}
`;

function syncZeroBlockRuntimeStyles(doc: Document, inlineUi: ZeroBlockCanvasInlineUi) {
  doc.documentElement.setAttribute("data-ln-zero-inline", inlineUi);
  let style = doc.getElementById(ZERO_BLOCK_RUNTIME_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = doc.createElement("style");
    style.id = ZERO_BLOCK_RUNTIME_STYLE_ID;
    doc.head.appendChild(style);
  }
  const base = `
/* === Zero Block base === */
.lemnity-zero-block{position:relative}
.lemnity-zero-block .lemnity-zero-canvas{position:relative;width:100%;min-height:100%;box-sizing:border-box}
.lemnity-zero-block[data-ln-zero-editing="1"]{outline:2px solid #f26b4f;outline-offset:-2px}

/* === Top-right toolbar: «Редактировать» всегда на основном холсте (minimal); в full — только в режиме редактирования === */
.lemnity-zero-block [data-ln-zero-ui="toolbar"]{display:flex;position:absolute;top:10px;right:10px;z-index:50;align-items:center;gap:6px}
html[data-ln-zero-inline="full"] .lemnity-zero-block:not([data-ln-zero-editing="1"]) [data-ln-zero-ui="toolbar"]{display:none!important}
.lemnity-zero-block [data-ln-zero-open-editor]{display:flex;align-items:center;gap:6px;border:none;border-radius:8px;background:#f26b4f;color:#fff;padding:6px 14px;font:600 12.5px/1 system-ui,sans-serif;cursor:pointer;transition:background .12s}
.lemnity-zero-block [data-ln-zero-open-editor]:hover{background:#e85a3e}
.lemnity-zero-block [data-ln-zero-save]{display:flex;align-items:center;gap:6px;border:1px solid #d1d5db;border-radius:8px;background:#fff;color:#0f172a;padding:6px 14px;font:600 12.5px/1 system-ui,sans-serif;cursor:pointer;transition:background .12s}
.lemnity-zero-block [data-ln-zero-save]:hover{background:#f8fafc}
.lemnity-zero-block[data-ln-zero-saving="1"] [data-ln-zero-save]{background:#f1f5f9}
.lemnity-zero-block [data-ln-zero-edit]{display:none}

/* === Top-left "+" menu === */
.lemnity-zero-block [data-ln-zero-ui="menu"]{display:none;position:absolute;top:12px;left:12px;z-index:50}
.lemnity-zero-block[data-ln-zero-editing="1"] [data-ln-zero-ui="menu"]{display:block}

/* Plus button */
.lemnity-zero-block [data-ln-zero-plus]{width:36px;height:36px;border:none;border-radius:50%;background:#f26b4f;color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 3px 10px rgba(242,107,79,.4);transition:transform .12s,box-shadow .12s}
.lemnity-zero-block [data-ln-zero-plus]:hover{transform:scale(1.07);box-shadow:0 5px 16px rgba(242,107,79,.52)}

/* Picker dropdown */
.lemnity-zero-block [data-ln-zero-ui="picker"]{display:none;position:absolute;top:calc(100% + 8px);left:0;z-index:60;min-width:220px;background:#fff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 8px 28px rgba(15,23,42,.14);padding:5px 0;overflow:hidden}
.lemnity-zero-block[data-ln-zero-menu-open="1"] [data-ln-zero-ui="picker"]{display:block}

/* Picker rows and items */
.lemnity-zero-block [data-ln-zero-row]{padding:1px 6px}
.lemnity-zero-block [data-ln-zero-add]{width:100%;display:flex;align-items:center;gap:9px;border:none;background:transparent;color:#0f172a;font:500 13.5px/1 system-ui,sans-serif;padding:8px 10px;border-radius:8px;cursor:pointer;text-align:left}
.lemnity-zero-block [data-ln-zero-add]:hover{background:#f8fafc}
.lemnity-zero-block [data-ln-zero-add] .ln-icon{width:20px;height:20px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#64748b}
.lemnity-zero-block [data-ln-zero-add] .ln-label{flex:1}
.lemnity-zero-block [data-ln-zero-add] .ln-kbd{font:700 11px/1 system-ui,sans-serif;color:#9ca3af;background:#f1f5f9;border:1px solid #e5e7eb;border-radius:5px;padding:2px 7px;min-width:20px;text-align:center}
.lemnity-zero-block [data-ln-zero-sep]{height:1px;background:#f1f5f9;margin:4px 0}

/* === Inspector: hidden (position info via GrapesJS panels) === */
.lemnity-zero-block [data-ln-zero-ui="inspector"]{display:none!important}

/* === Backdrop: hidden in inline mode === */
.lemnity-zero-block [data-ln-zero-ui="backdrop"]{display:none!important}

/* === Bottom floating toolbar (Tilda-style pill) === */
.lemnity-zero-block [data-ln-zero-ui="toolbar-bottom"]{display:none;position:absolute;bottom:16px;left:50%;transform:translateX(-50%);z-index:50;background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:999px;padding:5px 10px;gap:2px;box-shadow:0 4px 18px rgba(15,23,42,.13),0 1px 3px rgba(15,23,42,.07);white-space:nowrap}
.lemnity-zero-block[data-ln-zero-editing="1"] [data-ln-zero-ui="toolbar-bottom"]{display:flex;align-items:center}

/* Toolbar tool buttons */
.lemnity-zero-block [data-ln-zero-tool]{width:34px;height:34px;display:inline-flex;align-items:center;justify-content:center;border:none;background:transparent;color:#64748b;border-radius:8px;cursor:pointer;transition:background .1s,color .1s;flex-shrink:0}
.lemnity-zero-block [data-ln-zero-tool]:hover{background:#f1f5f9;color:#0f172a}
.lemnity-zero-block [data-ln-zero-tool][data-ln-active]{background:#f26b4f;color:#fff}
.lemnity-zero-block [data-ln-zero-tool-sep]{width:1px;height:20px;background:#e2e8f0;margin:0 4px;flex-shrink:0}

/* Inspector fields (kept for API compat) */
.lemnity-zero-block [data-ln-zero-inspector-title]{margin:0 0 10px;color:#0f172a;font:700 13px/1.2 system-ui,sans-serif}
.lemnity-zero-block [data-ln-zero-grid]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.lemnity-zero-block [data-ln-zero-field-wrap]{display:flex;flex-direction:column;gap:5px}
.lemnity-zero-block [data-ln-zero-field-wrap] label{font:600 11px/1 system-ui,sans-serif;color:#64748b;letter-spacing:.02em}
.lemnity-zero-block [data-ln-zero-field]{height:34px;border:1px solid #d5deeb;border-radius:8px;padding:0 9px;font:600 13px/1 system-ui,sans-serif;color:#0f172a;background:#fff}
.lemnity-zero-block [data-ln-zero-field]:disabled{background:#f8fafc;color:#94a3b8}

/* === Grid settings panel === */
.lemnity-zero-block [data-ln-zero-ui="grid-panel"]{display:none;position:absolute;bottom:72px;left:50%;transform:translateX(-50%);z-index:52;background:#fff;border:1px solid rgba(15,23,42,.1);border-radius:12px;padding:14px 16px;box-shadow:0 8px 28px rgba(15,23,42,.14);min-width:230px;white-space:nowrap}
.lemnity-zero-block[data-ln-zb-grid-panel="1"][data-ln-zero-editing="1"] [data-ln-zero-ui="grid-panel"]{display:block}
.lemnity-zero-block [data-ln-grid-title]{margin:0 0 10px;font:700 12px/1.2 system-ui,sans-serif;color:#0f172a}
.lemnity-zero-block [data-ln-grid-rows]{display:flex;flex-direction:column;gap:7px}
.lemnity-zero-block [data-ln-grid-row]{display:flex;align-items:center;justify-content:space-between;gap:10px}
.lemnity-zero-block [data-ln-grid-label]{font:600 11px/1 system-ui,sans-serif;color:#64748b;letter-spacing:.03em;flex:1}
.lemnity-zero-block [data-ln-grid-num]{width:56px;height:28px;border:1px solid #d5deeb;border-radius:6px;padding:0 7px;font:600 12px/1 system-ui,sans-serif;color:#0f172a;text-align:right;background:#fff;flex-shrink:0}
.lemnity-zero-block [data-ln-grid-toggle-btn]{height:26px;border:1px solid #d5deeb;border-radius:100px;padding:0 10px;font:600 11px/1 system-ui,sans-serif;color:#64748b;background:#f8fafc;cursor:pointer;transition:background .1s,color .1s,border-color .1s;flex-shrink:0}
.lemnity-zero-block [data-ln-grid-toggle-btn][data-ln-active]{background:#6366f1;color:#fff;border-color:#6366f1}
.lemnity-zero-block [data-ln-col-info]{display:none;margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9}
.lemnity-zero-block [data-ln-col-info].active{display:block}
.lemnity-zero-block [data-ln-col-info-title]{margin:0 0 8px;font:600 11px/1.2 system-ui,sans-serif;color:#64748b;letter-spacing:.03em}
.lemnity-zero-canvas{position:relative}
.lemnity-zero-canvas::before,.lemnity-zero-canvas::after{content:none;pointer-events:none}
`;
  style.textContent = base + (inlineUi === "minimal" ? ZERO_BLOCK_RUNTIME_CSS_MINIMAL : "");
}

function findZeroBlockModelByElement(editor: Editor, sectionEl: HTMLElement): Component | null {
  const sections = editor.getWrapper()?.find?.("section.lemnity-zero-block") ?? [];
  for (const section of sections as Component[]) {
    if (section.getEl?.() === sectionEl) return section;
  }
  return null;
}

function nextZeroBlockCoordinates(sectionEl: HTMLElement): { top: number; left: number } {
  const canvas = sectionEl.querySelector<HTMLElement>(":scope > .lemnity-zero-canvas") ?? sectionEl;
  const children = Array.from(canvas.children).filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    if (node.getAttribute("data-ln-editor-hint") === "1") return false;
    return true;
  });
  const idx = children.length;
  return {
    top: ZERO_BLOCK_BASE_TOP_PX + idx * ZERO_BLOCK_STEP_Y_PX,
    left: ZERO_BLOCK_BASE_LEFT_PX + (idx % ZERO_BLOCK_COLUMNS) * ZERO_BLOCK_STEP_X_PX,
  };
}

function zeroBlockMarkup(kind: ZeroBlockInsertKind, top: number, left: number): string {
  if (kind === "text") {
    return `<div style="position:absolute;top:${top}px;left:${left}px;font-family:Inter,Arial,sans-serif;font-size:44px;font-weight:700;line-height:1.1;color:#0f172a;">Новый текст</div>`;
  }
  if (kind === "image") {
    return `<img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72" alt="" style="position:absolute;top:${top}px;left:${left}px;width:260px;max-width:260px;border-radius:12px;display:block;" />`;
  }
  if (kind === "shape") {
    return `<div style="position:absolute;top:${top}px;left:${left}px;width:180px;height:120px;border-radius:14px;background:#f1f5f9;border:1px solid #cbd5e1;"></div>`;
  }
  if (kind === "button") {
    return `<a href="#" style="position:absolute;top:${top}px;left:${left}px;display:inline-flex;align-items:center;justify-content:center;padding:13px 20px;border-radius:999px;background:#0f172a;color:#fff;text-decoration:none;font-weight:700;font-size:14px;">Кнопка</a>`;
  }
  if (kind === "video") {
    return `<div style="position:absolute;top:${top}px;left:${left}px;width:360px;max-width:360px;aspect-ratio:16/9;border-radius:14px;border:1px solid #cbd5e1;display:flex;align-items:center;justify-content:center;background:#0f172a;color:#fff;font:600 13px/1 system-ui,sans-serif;">Видео</div>`;
  }
  if (kind === "html") {
    return `<div style="position:absolute;top:${top}px;left:${left}px;min-width:260px;padding:12px 14px;border-radius:12px;border:1px dashed #94a3b8;background:#f8fafc;color:#334155;font:500 12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;">&lt;HTML&gt; custom snippet</div>`;
  }
  if (kind === "tooltip") {
    return `<div style="position:absolute;top:${top}px;left:${left}px;padding:10px 12px;border-radius:8px;background:#111827;color:#fff;font:500 12px/1.35 system-ui,sans-serif;">Подсказка</div>`;
  }
  if (kind === "form") {
    return `<form method="post" action="#" style="position:absolute;top:${top}px;left:${left}px;width:320px;max-width:320px;padding:14px;border:1px solid #d1d5db;border-radius:12px;background:#fff;display:grid;gap:8px;"><input name="name" placeholder="Имя" style="padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;" /><input name="email" type="email" placeholder="Email" style="padding:9px 10px;border:1px solid #cbd5e1;border-radius:8px;" /><button type="submit" style="padding:9px 12px;border:none;border-radius:8px;background:#0f172a;color:#fff;font-weight:700;">Отправить</button></form>`;
  }
  if (kind === "vector") {
    return `<svg style="position:absolute;top:${top}px;left:${left}px;overflow:visible;" width="120" height="80" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 60 C 40 10, 80 10, 110 60" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round"/></svg>`;
  }
  return `<div style="position:absolute;top:${top}px;left:${left}px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:320px;"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;" /><img src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;" /><img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;" /></div>`;
}

function appendZeroBlockElement(editor: Editor, sectionEl: HTMLElement, kind: ZeroBlockInsertKind) {
  const sectionModel = findZeroBlockModelByElement(editor, sectionEl);
  if (!sectionModel) return;
  lockZeroBlockSectionInStructure(sectionModel);
  const canvasModel = ensureZeroBlockInnerCanvas(sectionModel) ?? sectionModel;
  const { top, left } = nextZeroBlockCoordinates(sectionEl);
  canvasModel.append(zeroBlockMarkup(kind, top, left) as never);
  editor.select(sectionModel);
}

function forceSaveZeroBlock(editor: Editor, sectionEl: HTMLElement) {
  const sectionModel = findZeroBlockModelByElement(editor, sectionEl);
  if (sectionModel) editor.select(sectionModel);
  editor.refresh?.();
  const triggerEditor = editor as Editor & { trigger?: (event: string) => void };
  triggerEditor.trigger?.("update");
  sectionEl.setAttribute("data-ln-zero-saving", "1");
  const timerHost = sectionEl.ownerDocument.defaultView;
  timerHost?.setTimeout(() => {
    if (sectionEl.isConnected) sectionEl.removeAttribute("data-ln-zero-saving");
  }, 900);
}

function closeAllZeroBlockEditors(doc: Document) {
  doc.querySelectorAll<HTMLElement>("section.lemnity-zero-block[data-ln-zero-editing='1']").forEach((section) => {
    section.removeAttribute("data-ln-zero-editing");
    section.removeAttribute("data-ln-zero-menu-open");
  });
}

function parsePxLike(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value === "string") {
    const n = Number.parseFloat(value.replace("px", "").trim());
    if (Number.isFinite(n)) return Math.round(n);
  }
  return 0;
}

function attachZeroBlockEditorRuntime(
  editor: Editor,
  win: Window | undefined,
  getOnOpenZeroBlockEditor: () => ((blockId: string) => void) | undefined,
  zeroInlineUi: ZeroBlockCanvasInlineUi,
): () => void {
  const doc = win?.document;
  if (!doc) return () => {};
  syncZeroBlockRuntimeStyles(doc, zeroInlineUi);

  const readSelectedForActiveSection = (): Component | null => {
    const selected = editor.getSelected?.() ?? null;
    if (!selected || !hasZeroBlockAncestor(selected)) return null;
    const selectedEl = selected.getEl?.();
    const activeSection = doc.querySelector<HTMLElement>("section.lemnity-zero-block[data-ln-zero-editing='1']");
    if (!selectedEl || !activeSection) return null;
    return activeSection.contains(selectedEl) ? selected : null;
  };

  const syncInspectorUi = () => {
    const activeSection = doc.querySelector<HTMLElement>("section.lemnity-zero-block[data-ln-zero-editing='1']");
    if (!activeSection) return;
    const selected = readSelectedForActiveSection();
    const fields = activeSection.querySelectorAll<HTMLInputElement>("[data-ln-zero-field]");
    if (!fields.length) return;
    const style = selected ? ((selected.getStyle?.() ?? {}) as Record<string, unknown>) : {};
    fields.forEach((field) => {
      const key = field.getAttribute("data-ln-zero-field");
      if (!key) return;
      field.disabled = !selected;
      if (!selected) {
        field.value = "";
        return;
      }
      if (key === "x") field.value = String(parsePxLike(style.left));
      else if (key === "y") field.value = String(parsePxLike(style.top));
      else if (key === "w") field.value = String(parsePxLike(style.width));
      else if (key === "h") field.value = String(parsePxLike(style.height));
    });
    syncColInfo();
  };

  const syncGridPanel = (section: HTMLElement) => {
    const panel = section.querySelector<HTMLElement>("[data-ln-zero-ui='grid-panel']");
    if (!panel) return;
    const attrs: Record<string, string> = {};
    for (const attr of Array.from(section.attributes)) attrs[attr.name] = attr.value;
    const config = readZbGridConfig(attrs);
    const colsInput = panel.querySelector<HTMLInputElement>("[data-ln-grid-field='cols']");
    const marginInput = panel.querySelector<HTMLInputElement>("[data-ln-grid-field='margin']");
    const gutterInput = panel.querySelector<HTMLInputElement>("[data-ln-grid-field='gutter']");
    const visibleBtn = panel.querySelector<HTMLElement>("[data-ln-grid-toggle='visible']");
    const snapBtn = panel.querySelector<HTMLElement>("[data-ln-grid-toggle='snap']");
    if (colsInput) colsInput.value = String(config.columns);
    if (marginInput) marginInput.value = String(config.marginPx);
    if (gutterInput) gutterInput.value = String(config.gutterPx);
    if (visibleBtn) {
      visibleBtn.textContent = config.visible ? "Вкл" : "Выкл";
      if (config.visible) visibleBtn.setAttribute("data-ln-active", "1");
      else visibleBtn.removeAttribute("data-ln-active");
    }
    if (snapBtn) {
      snapBtn.textContent = config.snapEnabled ? "Вкл" : "Выкл";
      if (config.snapEnabled) snapBtn.setAttribute("data-ln-active", "1");
      else snapBtn.removeAttribute("data-ln-active");
    }
  };

  const syncColInfo = () => {
    doc.querySelectorAll<HTMLElement>("section.lemnity-zero-block[data-ln-zb-grid-panel='1'][data-ln-zero-editing='1']").forEach((section) => {
      const colInfo = section.querySelector<HTMLElement>("[data-ln-col-info]");
      if (!colInfo) return;
      const selected = readSelectedForActiveSection();
      if (!selected || !section.contains(selected.getEl?.() ?? null)) {
        colInfo.classList.remove("active");
        return;
      }
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(section.attributes)) attrs[attr.name] = attr.value;
      const config = readZbGridConfig(attrs);
      const sectionWidth = section.clientWidth || 0;
      const style = (selected.getStyle?.() ?? {}) as Record<string, unknown>;
      const { col, span } = pxToColSpan(parsePxLike(style.left), parsePxLike(style.width), sectionWidth, config);
      const colInput = colInfo.querySelector<HTMLInputElement>("[data-ln-grid-field='col']");
      const spanInput = colInfo.querySelector<HTMLInputElement>("[data-ln-grid-field='span']");
      if (colInput) colInput.value = String(col);
      if (spanInput) spanInput.value = String(span);
      colInfo.classList.add("active");
    });
  };

  const saveAndCloseSection = (section: HTMLElement) => {
    forceSaveZeroBlock(editor, section);
    section.removeAttribute("data-ln-zero-editing");
    section.removeAttribute("data-ln-zero-menu-open");
  };

  const setActiveToolInSection = (section: HTMLElement, toolName: string) => {
    section.querySelectorAll<HTMLElement>("[data-ln-zero-tool]").forEach((btn) => btn.removeAttribute("data-ln-active"));
    const btn = section.querySelector<HTMLElement>(`[data-ln-zero-tool="${toolName}"]`);
    if (btn) btn.setAttribute("data-ln-active", "1");
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    // "Редактировать" — open zero block in dedicated editor page
    const openEditorButton = target.closest<HTMLElement>("[data-ln-zero-open-editor]");
    if (openEditorButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = openEditorButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      const blockId = section.getAttribute("data-ln-zero-id") ?? "";
      const openFn = getOnOpenZeroBlockEditor?.();
      if (blockId && openFn) {
        openEditorButton.setAttribute("data-loading", "1");
        openEditorButton.textContent = "Загрузка…";
        openFn(blockId);
      }
      return;
    }

    // Save / Готово button
    const saveButton = target.closest<HTMLElement>("[data-ln-zero-save]");
    if (saveButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = saveButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      saveAndCloseSection(section);
      return;
    }

    // Legacy close button (backdrop)
    const closeButton = target.closest<HTMLElement>("[data-ln-zero-close]");
    if (closeButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = closeButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      section.removeAttribute("data-ln-zero-editing");
      section.removeAttribute("data-ln-zero-menu-open");
      return;
    }

    // "+" button toggles picker
    const plusButton = target.closest<HTMLElement>("[data-ln-zero-plus]");
    if (plusButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = plusButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      const open = section.getAttribute("data-ln-zero-menu-open") === "1";
      section.setAttribute("data-ln-zero-menu-open", open ? "0" : "1");
      return;
    }

    // "More" toolbar button toggles picker (same as "+")
    const moreButton = target.closest<HTMLElement>("[data-ln-zero-tool='more']");
    if (moreButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = moreButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      const open = section.getAttribute("data-ln-zero-menu-open") === "1";
      section.setAttribute("data-ln-zero-menu-open", open ? "0" : "1");
      return;
    }

    // Toolbar tool buttons that add elements directly
    const toolAddButton = target.closest<HTMLElement>("[data-ln-zero-tool-add]");
    if (toolAddButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = toolAddButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      const kind = String(toolAddButton.getAttribute("data-ln-zero-tool-add") ?? "") as ZeroBlockInsertKind;
      const toolName = toolAddButton.getAttribute("data-ln-zero-tool") ?? "";
      setActiveToolInSection(section, toolName);
      appendZeroBlockElement(editor, section, kind);
      section.setAttribute("data-ln-zero-menu-open", "0");
      queueMicrotask(syncInspectorUi);
      return;
    }

    // Select tool — no element added, just set active
    const selectButton = target.closest<HTMLElement>("[data-ln-zero-tool='select']");
    if (selectButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = selectButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      setActiveToolInSection(section, "select");
      return;
    }

    // Picker "add" buttons
    const addButton = target.closest<HTMLElement>("[data-ln-zero-add]");
    if (addButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = addButton.closest<HTMLElement>("section.lemnity-zero-block");
      const kind = String(addButton.getAttribute("data-ln-zero-add") ?? "") as ZeroBlockInsertKind;
      if (!section) return;
      appendZeroBlockElement(editor, section, kind);
      section.setAttribute("data-ln-zero-menu-open", "0");
      queueMicrotask(syncInspectorUi);
      return;
    }

    // Grid tool button — toggle grid settings panel
    const gridButton = target.closest<HTMLElement>("[data-ln-zero-tool='grid']");
    if (gridButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = gridButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      const open = section.getAttribute("data-ln-zb-grid-panel") === "1";
      section.setAttribute("data-ln-zb-grid-panel", open ? "0" : "1");
      if (!open) {
        setActiveToolInSection(section, "grid");
        syncGridPanel(section);
        queueMicrotask(syncColInfo);
      } else {
        setActiveToolInSection(section, "select");
      }
      return;
    }

    // Grid toggle buttons (visible / snap)
    const gridToggle = target.closest<HTMLElement>("[data-ln-grid-toggle]");
    if (gridToggle) {
      event.preventDefault();
      event.stopPropagation();
      const section = gridToggle.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      const sectionModel = findZeroBlockModelByElement(editor, section);
      if (!sectionModel) return;
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(section.attributes)) attrs[attr.name] = attr.value;
      const config = readZbGridConfig(attrs);
      const which = gridToggle.getAttribute("data-ln-grid-toggle");
      if (which === "visible") config.visible = !config.visible;
      else if (which === "snap") config.snapEnabled = !config.snapEnabled;
      sectionModel.setAttributes?.(zbGridConfigToAttrs(config));
      queueMicrotask(() => {
        syncZeroBlockGridOverlays(editor);
        syncGridPanel(section);
      });
      return;
    }

    // Auto-enter editing mode when clicking inside a zero block (full UI only)
    const zeroSection = target.closest<HTMLElement>("section.lemnity-zero-block");
    if (zeroInlineUi === "full" && zeroSection && !target.closest("[data-ln-zero-ui]")) {
      if (zeroSection.getAttribute("data-ln-zero-editing") !== "1") {
        closeAllZeroBlockEditors(doc);
        ensureZeroBlockUi(zeroSection);
        zeroSection.setAttribute("data-ln-zero-editing", "1");
        const sectionModel = findZeroBlockModelByElement(editor, zeroSection);
        if (sectionModel) editor.select(sectionModel);
        queueMicrotask(syncInspectorUi);
        return;
      }
      // Close picker when clicking canvas area (not a UI element)
      zeroSection.setAttribute("data-ln-zero-menu-open", "0");
      // Select child element
      let node: HTMLElement | null = target;
      while (node && node.parentElement !== zeroSection) {
        node = node.parentElement;
      }
      if (!node) return;
      const sectionModel = findZeroBlockModelByElement(editor, zeroSection);
      if (!sectionModel) return;
      let picked: Component | null = null;
      sectionModel.components?.().forEach?.((child: Component) => {
        if (picked) return;
        if (child.getEl?.() === node) picked = child;
      });
      if (picked) {
        editor.select(picked);
        queueMicrotask(syncInspectorUi);
      }
      return;
    }

    // Click outside any zero block — close active editor
    const activeSection = doc.querySelector<HTMLElement>("section.lemnity-zero-block[data-ln-zero-editing='1']");
    if (activeSection && !zeroSection) {
      saveAndCloseSection(activeSection);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      const active = doc.querySelector<HTMLElement>("section.lemnity-zero-block[data-ln-zero-editing='1']");
      if (!active) return;
      event.preventDefault();
      saveAndCloseSection(active);
      return;
    }
    if (event.key !== "Escape") return;
    closeAllZeroBlockEditors(doc);
  };

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target || target.tagName !== "INPUT") return;

    // Inspector X/Y/W/H fields
    const zeroFieldKey = target.getAttribute("data-ln-zero-field");
    if (zeroFieldKey) {
      const selected = readSelectedForActiveSection();
      if (!selected) return;
      const value = Number.parseFloat(target.value);
      if (!Number.isFinite(value)) return;
      const stylePatch: Record<string, string> = { position: "absolute" };
      if (zeroFieldKey === "x") stylePatch.left = `${Math.round(value)}px`;
      else if (zeroFieldKey === "y") stylePatch.top = `${Math.round(value)}px`;
      else if (zeroFieldKey === "w") stylePatch.width = `${Math.max(1, Math.round(value))}px`;
      else if (zeroFieldKey === "h") stylePatch.height = `${Math.max(1, Math.round(value))}px`;
      selected.addStyle(stylePatch);
      return;
    }

    // Grid settings fields
    const gridFieldKey = target.getAttribute("data-ln-grid-field");
    if (!gridFieldKey) return;

    const section = target.closest<HTMLElement>("section.lemnity-zero-block");
    if (!section) return;

    // col/span fields: update the selected element's position
    if (gridFieldKey === "col" || gridFieldKey === "span") {
      const selected = readSelectedForActiveSection();
      if (!selected) return;
      const attrs: Record<string, string> = {};
      for (const attr of Array.from(section.attributes)) attrs[attr.name] = attr.value;
      const config = readZbGridConfig(attrs);
      const sectionWidth = section.clientWidth || 0;
      const style = (selected.getStyle?.() ?? {}) as Record<string, unknown>;
      const { col: curCol, span: curSpan } = pxToColSpan(parsePxLike(style.left), parsePxLike(style.width), sectionWidth, config);
      const value = parseInt(target.value, 10);
      if (!Number.isFinite(value)) return;
      const col = gridFieldKey === "col" ? Math.max(1, value) : curCol;
      const span = gridFieldKey === "span" ? Math.max(1, value) : curSpan;
      const { x, w } = colSpanToPx(col, span, sectionWidth, config);
      selected.addStyle({ left: `${x}px`, width: `${w}px` });
      queueMicrotask(syncColInfo);
      return;
    }

    // Grid config fields: update section attributes
    const sectionModel = findZeroBlockModelByElement(editor, section);
    if (!sectionModel) return;
    const attrs: Record<string, string> = {};
    for (const attr of Array.from(section.attributes)) attrs[attr.name] = attr.value;
    const config = readZbGridConfig(attrs);
    const value = parseInt(target.value, 10);
    if (!Number.isFinite(value)) return;
    if (gridFieldKey === "cols") config.columns = Math.min(24, Math.max(1, value));
    else if (gridFieldKey === "margin") config.marginPx = Math.max(0, value);
    else if (gridFieldKey === "gutter") config.gutterPx = Math.max(0, value);
    sectionModel.setAttributes?.(zbGridConfigToAttrs(config));
    queueMicrotask(() => {
      syncZeroBlockGridOverlays(editor);
      syncColInfo();
    });
  };

  const onSelectionChange = () => queueMicrotask(syncInspectorUi);

  doc.addEventListener("click", onClick, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("input", onInput, true);
  editor.on("component:selected", onSelectionChange);
  editor.on("component:update", onSelectionChange as never);
  return () => {
    doc.removeEventListener("click", onClick, true);
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("input", onInput, true);
    editor.off?.("component:selected", onSelectionChange);
    editor.off?.("component:update", onSelectionChange as never);
  };
}

function readComponentClasses(component: Component): string[] {
  const cls = component.getClasses?.();
  if (Array.isArray(cls)) return cls.map(String);
  if (typeof cls === "string") return cls.split(/\s+/).filter(Boolean);
  return [];
}

function isZeroBlockSectionComponent(component: Component | null | undefined): boolean {
  if (!component?.get) return false;
  if (String(component.get("tagName") ?? "").toLowerCase() !== "section") return false;
  return readComponentClasses(component).includes("lemnity-zero-block");
}

const ZERO_CANVAS_CLASS = "lemnity-zero-canvas";

function isZeroBlockCanvasComponent(c: Component | null | undefined): boolean {
  if (!c?.get) return false;
  if (String(c.get("tagName") ?? "").toLowerCase() !== "div") return false;
  if (readComponentClasses(c).includes(ZERO_CANVAS_CLASS)) return true;
  const attrs = (c.getAttributes?.() ?? {}) as Record<string, string>;
  return attrs["data-ln-zero-canvas"] === "1";
}

function shouldStayOnZeroSectionDirectChild(component: Component): boolean {
  const tag = String(component.get?.("tagName") ?? "").toLowerCase();
  if (tag === "style") return true;
  const attrs = (component.getAttributes?.() ?? {}) as Record<string, string>;
  if (attrs["data-ln-editor-hint"] === "1") return true;
  if (isZeroBlockCanvasComponent(component)) return true;
  return false;
}

/** Холст слоёв внутри секции: координаты absolute совпадают с коридором 12 колонок (padding секции). */
function ensureZeroBlockInnerCanvas(section: Component | null | undefined): Component | null {
  if (!section || !isZeroBlockSectionComponent(section)) return null;
  const coll = section.components?.();
  if (!coll) return null;

  let existing: Component | null = null;
  coll.forEach?.((child: Component) => {
    if (isZeroBlockCanvasComponent(child)) existing = child;
  });
  if (existing) return existing;

  const toMove: Component[] = [];
  coll.forEach?.((child: Component) => {
    if (!shouldStayOnZeroSectionDirectChild(child)) toMove.push(child);
  });

  section.append(
    `<div class="${ZERO_CANVAS_CLASS}" data-ln-zero-canvas="1" data-gjs-name="Zero canvas" style="position:relative;width:100%;min-height:100%;box-sizing:border-box;"></div>`,
  );

  let canvas: Component | null = null;
  section.components()?.forEach?.((child: Component) => {
    if (isZeroBlockCanvasComponent(child)) canvas = child;
  });
  if (!canvas) return null;

  (canvas as Component).set(
    {
      draggable: false,
      copyable: false,
      removable: false,
      layerable: false,
      highlightable: false,
    } as never,
  );

  toMove.forEach((ch) => {
    if (ch.parent() === section) (canvas as Component).append(ch);
  });

  return canvas;
}

function hasZeroBlockAncestor(component: Component | null | undefined): boolean {
  let cursor = component;
  while (cursor) {
    if (isZeroBlockSectionComponent(cursor)) return true;
    cursor = cursor.parent?.() ?? null;
  }
  return false;
}

function findZeroBlockSectionAncestor(component: Component | null | undefined): Component | null {
  let cursor = component;
  while (cursor) {
    if (isZeroBlockSectionComponent(cursor)) return cursor;
    cursor = cursor.parent?.() ?? null;
  }
  return null;
}

function openZeroBlockSettingsWindow(editor: Editor): boolean {
  const selected = editor.getSelected?.() ?? null;
  const zeroSection = findZeroBlockSectionAncestor(selected);
  if (!zeroSection) return false;
  lockZeroBlockSectionInStructure(zeroSection);
  const sectionEl = zeroSection.getEl?.();
  if (!(sectionEl instanceof HTMLElement)) return false;
  const doc = sectionEl.ownerDocument;
  const mode =
    (doc.documentElement.getAttribute("data-ln-zero-inline") as ZeroBlockCanvasInlineUi | null) || "minimal";
  syncZeroBlockRuntimeStyles(doc, mode);
  ensureZeroBlockUi(sectionEl);
  closeAllZeroBlockEditors(doc);
  sectionEl.setAttribute("data-ln-zero-editing", "1");
  editor.select(zeroSection);
  return true;
}

function lockZeroBlockSectionInStructure(section: Component | null | undefined) {
  if (!section || !isZeroBlockSectionComponent(section)) return;
  if (section.get("draggable") !== false) section.set("draggable", false);
  const attrs = (section.getAttributes?.() ?? {}) as Record<string, string>;
  if (!attrs["data-ln-zero-id"]) {
    section.setAttributes?.({ "data-ln-zero-id": `zb_${Math.random().toString(36).slice(2, 10)}` });
  }
  // Initialize default grid config if not yet set
  if (!attrs["data-ln-zb-grid"]) {
    section.setAttributes?.(zbGridConfigToAttrs(ZB_GRID_DEFAULTS));
  }
  ensureZeroBlockInnerCanvas(section);
}

function ensureZeroBlockChildResizable(component: Component) {
  if (!hasZeroBlockAncestor(component)) return;
  if (String(component.get("tagName") ?? "").toLowerCase() === "style") return;
  if (component.getAttributes?.()["data-ln-editor-hint"] === "1") return;
  component.set("resizable", { ...ZERO_BLOCK_RESIZE_HANDLES } as never);
}

function placeZeroBlockChildFreely(component: Component) {
  const zeroSection = findZeroBlockSectionAncestor(component);
  if (!zeroSection) return;

  lockZeroBlockSectionInStructure(zeroSection);
  const canvas = ensureZeroBlockInnerCanvas(zeroSection);

  if (
    canvas &&
    !shouldStayOnZeroSectionDirectChild(component) &&
    !isZeroBlockCanvasComponent(component) &&
    component.parent() === zeroSection
  ) {
    canvas.append(component);
  }

  if (String(component.get("tagName") ?? "").toLowerCase() === "style") return;
  if (component.getAttributes?.()["data-ln-editor-hint"] === "1") return;
  if (isZeroBlockCanvasComponent(component)) return;

  ensureZeroBlockChildResizable(component);

  const draggable = component.get("draggable");
  if (draggable !== ".lemnity-zero-block") {
    component.set("draggable", ".lemnity-zero-block");
  }

  const layoutParent = component.parent?.() ?? null;
  if (!layoutParent || !isZeroBlockCanvasComponent(layoutParent)) return;

  const siblings = layoutParent.components?.();
  let order = 0;
  siblings?.forEach?.((child: Component) => {
    if (child === component) return;
    if (child.getAttributes?.()["data-ln-editor-hint"] === "1") return;
    if (String(child.get("tagName") ?? "").toLowerCase() === "style") return;
    order += 1;
  });

  const currentStyle = (component.getStyle?.() ?? {}) as Record<string, unknown>;
  // Also check raw style attribute — getStyle() may return {} during component:add
  // before GrapesJS transfers inline styles into its model (timing issue on load).
  const rawStyleAttr = ((component.getAttributes?.() ?? {}) as Record<string, string>).style ?? "";
  const hasPositioningInRawStyle = /\b(position|top|left|right|bottom)\s*:/i.test(rawStyleAttr);
  const hasManualPlacement =
    currentStyle.position != null ||
    currentStyle.top != null ||
    currentStyle.left != null ||
    currentStyle.right != null ||
    currentStyle.bottom != null ||
    hasPositioningInRawStyle;

  if (hasManualPlacement) {
    if (String(currentStyle.position ?? "") !== "absolute" && !hasPositioningInRawStyle) {
      component.addStyle({ position: "absolute" });
    }
    return;
  }

  const offsetTop = 86 + order * 34;
  const offsetLeft = 18 + (order % 4) * 14;
  component.addStyle({
    position: "absolute",
    top: `${offsetTop}px`,
    left: `${offsetLeft}px`,
    margin: "0",
    "z-index": "2",
  });
}

function normalizeZeroBlockChildren(root: Component | null | undefined) {
  if (!root?.find) return;
  const runSection = (sec: Component) => {
    lockZeroBlockSectionInStructure(sec);
    const canvas = ensureZeroBlockInnerCanvas(sec);
    const host = canvas?.components?.() ?? sec.components?.();
    host?.forEach?.((child: Component) => {
      placeZeroBlockChildFreely(child);
    });
  };
  if (isZeroBlockSectionComponent(root)) {
    runSection(root);
    return;
  }
  root.find("section.lemnity-zero-block").forEach((section) => {
    runSection(section as Component);
  });
}

function removeZeroBlockLegacyHint(sectionEl: HTMLElement) {
  sectionEl
    .querySelectorAll<HTMLElement>(":scope > [data-ln-editor-hint='1']:not([data-ln-zero-ui])")
    .forEach((node) => node.remove());
}

function ensureZeroBlockUi(sectionEl: HTMLElement) {
  removeZeroBlockLegacyHint(sectionEl);
  if (sectionEl.querySelector("[data-ln-zero-ui='toolbar']")) return;

  const doc = sectionEl.ownerDocument;

  // Backdrop — kept for API compat, hidden via CSS
  const backdrop = doc.createElement("div");
  backdrop.setAttribute("data-ln-zero-ui", "backdrop");
  backdrop.setAttribute("data-ln-editor-hint", "1");
  backdrop.setAttribute("data-ln-zero-close", "1");

  // Top-right toolbar: "Открыть редактор" + "Готово"
  const toolbar = doc.createElement("div");
  toolbar.setAttribute("data-ln-zero-ui", "toolbar");
  toolbar.setAttribute("data-ln-editor-hint", "1");
  toolbar.innerHTML = `
    <button type="button" data-ln-zero-open-editor="1" aria-label="Открыть нулевой блок в отдельном редакторе">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M5.5 1H2a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1V7.5"/><polyline points="8 1 12 1 12 5"/><line x1="12" y1="1" x2="6" y2="7"/></svg>
      Редактировать
    </button>
    <button type="button" data-ln-zero-save="1" aria-label="Завершить редактирование нулевого блока">
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><polyline points="1.5 7 5 10.5 11.5 2.5"/></svg>
      Готово
    </button>`;

  // Top-left "+" button + picker dropdown
  const menu = doc.createElement("div");
  menu.setAttribute("data-ln-zero-ui", "menu");
  menu.setAttribute("data-ln-editor-hint", "1");
  menu.innerHTML = `
    <button type="button" data-ln-zero-plus="1" aria-label="Добавить элемент">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="8" y1="2" x2="8" y2="14"/><line x1="2" y1="8" x2="14" y2="8"/></svg>
    </button>
    <div data-ln-zero-ui="picker" role="menu" aria-label="Добавить элемент">
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="text" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v2H9.5v8h-3V5H3V3z"/></svg></span>
          <span class="ln-label">Текст</span><span class="ln-kbd">T</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="image" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M1.5 10l3.5-4 3 3 2-2L14.5 11"/><circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none"/></svg></span>
          <span class="ln-label">Изображение</span><span class="ln-kbd">I</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="shape" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2"/></svg></span>
          <span class="ln-label">Шейп</span><span class="ln-kbd">R</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="button" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="4.5" width="13" height="7" rx="3.5"/><line x1="5" y1="8" x2="11" y2="8" stroke-width="1.3" stroke-linecap="round"/></svg></span>
          <span class="ln-label">Кнопка</span><span class="ln-kbd">B</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="vector" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13C5 9 8 8 10 7s3-3 1-5"/><circle cx="10" cy="2.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg></span>
          <span class="ln-label">Вектор</span><span class="ln-kbd">P</span>
        </button>
      </div>
      <div data-ln-zero-sep></div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="video" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><polygon points="4,2.5 14,8 4,13.5"/><rect x="1" y="2.5" width="2.5" height="11" rx="1"/></svg></span>
          <span class="ln-label">Видео</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="html" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="5,5 2,8 5,11"/><polyline points="11,5 14,8 11,11"/><line x1="9.5" y1="3" x2="6.5" y2="13"/></svg></span>
          <span class="ln-label">HTML</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="tooltip" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="2" width="13" height="9" rx="2"/><path d="M5.5 11.5l2 2.5 2-2.5"/></svg></span>
          <span class="ln-label">Тултип</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="form" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1.5" y="2.5" width="13" height="3.5" rx="1"/><rect x="1.5" y="8.5" width="13" height="3.5" rx="1"/><line x1="14" y1="14" x2="1.5" y2="14" stroke-width="1.3"/></svg></span>
          <span class="ln-label">Форма</span>
        </button>
      </div>
      <div data-ln-zero-row>
        <button type="button" data-ln-zero-add="gallery" role="menuitem">
          <span class="ln-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg></span>
          <span class="ln-label">Галерея</span>
        </button>
      </div>
    </div>`;

  // Bottom floating pill toolbar
  const toolbarBottom = doc.createElement("div");
  toolbarBottom.setAttribute("data-ln-zero-ui", "toolbar-bottom");
  toolbarBottom.setAttribute("data-ln-editor-hint", "1");
  toolbarBottom.innerHTML = `
    <button type="button" data-ln-zero-tool="select" data-ln-active title="Выбрать">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><path d="M3 1.5l9 6-4.5 1.5-1 4.5L3 1.5z"/></svg>
    </button>
    <button type="button" data-ln-zero-tool="text" data-ln-zero-tool-add="text" title="Текст (T)">
      <svg width="15" height="15" viewBox="0 0 15 15" fill="currentColor"><path d="M2 2.5h11v2H8.5v8H6.5V4.5H2V2.5z"/></svg>
    </button>
    <button type="button" data-ln-zero-tool="image" data-ln-zero-tool-add="image" title="Изображение (I)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5"/><path d="M1.5 10l3.5-4 3 3 2-2L14.5 11"/><circle cx="5" cy="6" r="1.2" fill="currentColor" stroke="none"/></svg>
    </button>
    <button type="button" data-ln-zero-tool="shape" data-ln-zero-tool-add="shape" title="Шейп (R)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="12" height="12" rx="2.5"/></svg>
    </button>
    <button type="button" data-ln-zero-tool="button" data-ln-zero-tool-add="button" title="Кнопка (B)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1.5" y="4.5" width="13" height="7" rx="3.5"/><line x1="5" y1="8" x2="11" y2="8" stroke-width="1.3" stroke-linecap="round"/></svg>
    </button>
    <button type="button" data-ln-zero-tool="vector" data-ln-zero-tool-add="vector" title="Вектор (P)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 13C5 9 8 8 10 7s3-3 1-5"/><circle cx="10" cy="2.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="3" cy="13" r="1.5" fill="currentColor" stroke="none"/></svg>
    </button>
    <div data-ln-zero-tool-sep></div>
    <button type="button" data-ln-zero-tool="more" title="Больше элементов">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6.5l4 3.5 4-3.5"/></svg>
    </button>
    <div data-ln-zero-tool-sep></div>
    <button type="button" data-ln-zero-tool="grid" title="Настройки сетки">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="1" width="5.5" height="5.5" rx="1"/><rect x="9.5" y="1" width="5.5" height="5.5" rx="1"/><rect x="1" y="9.5" width="5.5" height="5.5" rx="1"/><rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1"/></svg>
    </button>`;

  // Inspector — kept for API compat, hidden via CSS
  const inspector = doc.createElement("div");
  inspector.setAttribute("data-ln-zero-ui", "inspector");
  inspector.setAttribute("data-ln-editor-hint", "1");
  inspector.innerHTML = `
    <p data-ln-zero-inspector-title>Позиция элемента</p>
    <div data-ln-zero-grid>
      <div data-ln-zero-field-wrap><label>X</label><input type="number" step="1" data-ln-zero-field="x" placeholder="0" /></div>
      <div data-ln-zero-field-wrap><label>Y</label><input type="number" step="1" data-ln-zero-field="y" placeholder="0" /></div>
      <div data-ln-zero-field-wrap><label>W</label><input type="number" step="1" data-ln-zero-field="w" placeholder="0" /></div>
      <div data-ln-zero-field-wrap><label>H</label><input type="number" step="1" data-ln-zero-field="h" placeholder="0" /></div>
    </div>`;

  // Grid settings panel
  const gridPanel = doc.createElement("div");
  gridPanel.setAttribute("data-ln-zero-ui", "grid-panel");
  gridPanel.setAttribute("data-ln-editor-hint", "1");
  gridPanel.innerHTML = `
    <p data-ln-grid-title>Сетка</p>
    <div data-ln-grid-rows>
      <div data-ln-grid-row>
        <span data-ln-grid-label>Колонки</span>
        <input type="number" min="1" max="24" step="1" data-ln-grid-num data-ln-grid-field="cols" value="12" />
      </div>
      <div data-ln-grid-row>
        <span data-ln-grid-label>Отступ, px</span>
        <input type="number" min="0" max="200" step="1" data-ln-grid-num data-ln-grid-field="margin" value="40" />
      </div>
      <div data-ln-grid-row>
        <span data-ln-grid-label>Гаттер, px</span>
        <input type="number" min="0" max="100" step="1" data-ln-grid-num data-ln-grid-field="gutter" value="20" />
      </div>
      <div data-ln-grid-row>
        <span data-ln-grid-label>Сетка</span>
        <button type="button" data-ln-grid-toggle-btn data-ln-grid-toggle="visible" data-ln-active>Вкл</button>
      </div>
      <div data-ln-grid-row>
        <span data-ln-grid-label>Прилипание</span>
        <button type="button" data-ln-grid-toggle-btn data-ln-grid-toggle="snap" data-ln-active>Вкл</button>
      </div>
    </div>
    <div data-ln-col-info>
      <p data-ln-col-info-title>ПОЗИЦИЯ В СЕТКЕ</p>
      <div data-ln-grid-rows>
        <div data-ln-grid-row>
          <span data-ln-grid-label>Колонка</span>
          <input type="number" min="1" step="1" data-ln-grid-num data-ln-grid-field="col" value="1" />
        </div>
        <div data-ln-grid-row>
          <span data-ln-grid-label>Ширина (кол.)</span>
          <input type="number" min="1" step="1" data-ln-grid-num data-ln-grid-field="span" value="1" />
        </div>
      </div>
    </div>`;

  sectionEl.prepend(gridPanel);
  sectionEl.prepend(toolbarBottom);
  sectionEl.prepend(inspector);
  sectionEl.prepend(menu);
  sectionEl.prepend(toolbar);
  sectionEl.prepend(backdrop);
}

function mountZeroBlockUiInFrame(editor: Editor, win: Window | undefined, zeroInlineUi: ZeroBlockCanvasInlineUi) {
  const doc = win?.document;
  if (!doc) return;
  syncZeroBlockRuntimeStyles(doc, zeroInlineUi);
  const sections = doc.querySelectorAll<HTMLElement>("section.lemnity-zero-block");
  sections.forEach((section) => {
    ensureZeroBlockUi(section);
    const model = findZeroBlockModelByElement(editor, section);
    if (model) {
      normalizeZeroBlockChildren(model);
    }
  });
}

function blockToHtml(block: BlockNode): string {
  const style = styleToString(block.styles);
  const sectionStyle = style ? ` style="${escapeHtml(style)}"` : "";

  if (block.type === "text") {
    return `${sectionOpen(sectionStyle)}><div>${escapeHtml(prop(block, "text", "Текст"))}</div></section>`;
  }

  if (block.type === "cover") {
    return `${sectionOpen(sectionStyle)}><h1>${escapeHtml(prop(block, "title", "Заголовок обложки"))}</h1><p>${escapeHtml(prop(block, "subtitle"))}</p><a href="#">${escapeHtml(prop(block, "buttonLabel", "Начать"))}</a></section>`;
  }

  if (block.type === "image") {
    return `${sectionOpen(sectionStyle)}><img src="${escapeHtml(prop(block, "src"))}" alt="${escapeHtml(prop(block, "alt"))}" style="max-width: 100%; border-radius: 24px;" /></section>`;
  }

  if (block.type === "gallery") {
    const images = Array.isArray(block.props.images) ? block.props.images.filter((item): item is string => typeof item === "string") : [];
    return `${sectionOpen(sectionStyle)}><div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">${images.map((src) => `<img src="${escapeHtml(src)}" alt="" style="width: 100%; border-radius: 20px;" />`).join("")}</div></section>`;
  }

  if (block.type === "button") {
    return `${sectionOpen(sectionStyle)}><a href="${escapeHtml(prop(block, "href", "#"))}">${escapeHtml(prop(block, "label", "Кнопка"))}</a></section>`;
  }

  if (block.type === "form") {
    return `${sectionOpen(sectionStyle)}><form method="post" action="#"><h2>${escapeHtml(prop(block, "title", "Форма"))}</h2><input name="name" placeholder="Имя" /><input name="email" type="email" placeholder="Электропочта" /><button type="submit">${escapeHtml(prop(block, "buttonLabel", "Отправить"))}</button></form></section>`;
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
          return `<button type="button"${styleAttr}>${escapeHtml(element.props.label ?? "Кнопка")}</button>`;
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
  // Always preserve seed CSS — it contains standard-block template styles.
  // Discarding it causes style loss on reload and after zero-block editor return.
  if (!seedCss) return editorCss;
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
    onOpenZeroBlockEditor,
    autoActivateZeroBlock,
    zeroBlockCanvasUi,
  },
  ref
) {
  const { t, lang } = useI18n();
  const zeroInlineUi: ZeroBlockCanvasInlineUi =
    autoActivateZeroBlock ? "full" : (zeroBlockCanvasUi ?? "minimal");
  const zeroInlineUiRef = useRef(zeroInlineUi);
  zeroInlineUiRef.current = zeroInlineUi;
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
  const onOpenZeroBlockEditorRef = useRef(onOpenZeroBlockEditor);
  onOpenZeroBlockEditorRef.current = onOpenZeroBlockEditor;
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
    let detachRightPanelsOverlay: (() => void) | undefined;
    let detachScopedStyles: (() => void) | undefined;
    let detachSectionWidthGrid: (() => void) | undefined;
    let detachBlockSettings: (() => void) | undefined;
    let detachElementTraits: (() => void) | undefined;
    let detachLayerActions: (() => void) | undefined;
    let detachDeviceDock: (() => void) | undefined;
    let detachZeroBlockRuntime: (() => void) | undefined;

    async function initEditor() {
      const refsReady = () => Boolean(containerRef.current?.isConnected && blocksRef.current?.isConnected);

      if (editorRef.current) return;

      for (let i = 0; i < 60 && mounted && !editorRef.current; i++) {
        if (refsReady()) break;
        await new Promise<void>((r) => requestAnimationFrame(() => r()));
      }

      if (!mounted) return;

      if (!refsReady() || editorRef.current) {
        setCanvasBooting(false);
        onInitErrorRef.current?.();
        return;
      }
      try {
        const [{ default: grapesjs }, { default: presetWebpage }, { default: basicBlocks }] = await Promise.all([
          import("grapesjs"),
          import("grapesjs-preset-webpage"),
          import("grapesjs-blocks-basic"),
        ]);
        if (!mounted) return;
        if (!refsReady()) {
          setCanvasBooting(false);
          if (!editorRef.current) onInitErrorRef.current?.();
          return;
        }

        const rawInitial = initialContentRef.current ?? starterContentRef.current;
        const initialContent: LemnityBoxCanvasContent = {
          html: rawInitial.html,
          css: mergeLemnityBoxSectionMotionCss(rawInitial.css),
        };
        const editor = grapesjs.init({
          container: containerRef.current!,
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
            appendTo: blocksRef.current!,
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
            (ed: Editor) => {
              attachLemnityBoxHtmlEmbed(ed);
              attachLemnityBoxAnchorComponent(ed);
            },
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
        registerLemnityBoxBlockSettingsToolbar(editor);
        detachViewportGuides = attachLemnityBoxCanvasViewportGuides(editor);
        detachScopedStyles = attachLemnityBoxComponentScopedStyles(editor);
        detachSectionWidthGrid = attachLemnityBoxSectionWidthGrid(editor);
        detachBlockSettings = attachLemnityBoxBlockSettings(editor);
        detachElementTraits = attachLemnityBoxElementQuickTraits(editor);
        detachLayerActions = attachLemnityBoxLayerActions(editor);

        const dragModeEditor = editor as Editor & {
          setDragMode?: (mode: "" | "translate" | "absolute") => void;
          getSelected?: () => Component | null;
        };
        const syncDragModeForSelection = () => {
          if (typeof dragModeEditor.setDragMode !== "function") return;
          const selected = dragModeEditor.getSelected?.() ?? null;
          dragModeEditor.setDragMode(hasZeroBlockAncestor(selected) ? "absolute" : "");
        };
        editor.on("component:selected", syncDragModeForSelection);
        editor.on("component:deselected", syncDragModeForSelection);

        // Snap elements to zero block grid on drag end
        editor.on("component:drag:end" as never, ((draggedComponent: Component) => {
          if (!hasZeroBlockAncestor(draggedComponent)) return;
          const zeroSection = findZeroBlockSectionAncestor(draggedComponent);
          if (!zeroSection) return;
          const attrs = (zeroSection.getAttributes?.() ?? {}) as Record<string, string>;
          const sectionEl = zeroSection.getEl?.();
          if (!(sectionEl instanceof HTMLElement)) return;
          const sectionWidth = sectionEl.clientWidth;
          if (!sectionWidth) return;
          const canvasDoc = sectionEl.ownerDocument;
          const pageGrid = readPageGridFromDoc(canvasDoc?.documentElement ?? null);
          const config = resolveZbGridConfig(attrs, pageGrid);
          if (!config.snapEnabled) return;
          // For sections without custom grid override, snap against canvas width so
          // column positions align with the standard page-level grid.
          const hasCustomGrid = attrs["data-ln-zb-cols"] != null;
          const snapWidth = hasCustomGrid ? sectionWidth : (canvasDoc?.body?.clientWidth ?? sectionWidth);
          const currentStyle = (draggedComponent.getStyle?.() ?? {}) as Record<string, unknown>;
          const x = parsePxLike(currentStyle.left);
          const y = parsePxLike(currentStyle.top);
          const snappedX = snapXToZbGrid(x, snapWidth, config);
          const snappedY = snapYToZbGrid(y, config.snapEnabled);
          if (snappedX !== x || snappedY !== y) {
            draggedComponent.addStyle({ left: `${snappedX}px`, top: `${snappedY}px` });
          }
        }) as never);

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
                if (list.includes("lemnity-zero-block")) {
                  lockZeroBlockSectionInStructure(model);
                  requestAnimationFrame(() => {
                    const sectionEl = model.getEl?.();
                    if (sectionEl instanceof HTMLElement) {
                      const doc = sectionEl.ownerDocument;
                      syncZeroBlockRuntimeStyles(doc, zeroInlineUiRef.current);
                      ensureZeroBlockUi(sectionEl);
                    }
                  });
                }
              }
            }

            placeZeroBlockChildFreely(model);
            queueMicrotask(syncDragModeForSelection);

            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                collapseLemnityRightPanelsFromEditor(editor);
              });
            });

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
        queueMicrotask(() => {
          normalizeZeroBlockChildren(editor.getWrapper());
          syncDragModeForSelection();
        });

        editor.Commands.add("open-blocks", {
          run() {
            const next = !blocksPanelOpenRef.current;
            setBlocksPanelOpenRef.current(next);
          },
        });
        editor.Commands.add(ZERO_BLOCK_SETTINGS_COMMAND, {
          run(ed: Editor) {
            return openZeroBlockSettingsWindow(ed);
          },
        });

        editor.BlockManager.add("landing-hero", {
          label: "Главный экран",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Главный экран</h2><p>Клик — обложки и варианты первого экрана в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-header", {
          label: "Шапка и меню",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Шапка и меню</h2><p>Клик — выберите вариант навигации в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-buttons", {
          label: "Кнопки",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Кнопки</h2><p>Клик — выберите вариант кнопок и CTA в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-about", {
          label: "О нас",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>О нас</h2><p>Клик — выберите макет блока «О нас» в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-benefits", {
          label: "Преимущества",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Преимущества</h2><p>Клик — выберите макет блока «Преимущества» в панели справа.</p></section>`,
        });
        editor.BlockManager.add("text-section", {
          label: "Текст",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Текст</h2><p>Клик — выберите макет текстовой секции в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-list", {
          label: "Список",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Список</h2><p>Клик — макеты списков и блоков в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-team", {
          label: "Команда",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Команда</h2><p>Клик — выберите макет блока «Команда» в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-contacts", {
          label: "Контакты",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Контакты</h2><p>Клик — выберите макет блока контактов в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-forms", {
          label: "Формы",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Формы</h2><p>Клик — выберите шаблон формы в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-shop", {
          label: "Магазин",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Магазин</h2><p>Клик — блоки витрины в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-accordion", {
          label: "Аккордеон",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Аккордеон</h2><p>Клик — FAQ, вкладки и раскрывающиеся блоки в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-basic-widgets", {
          label: "Базовые виджеты",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Базовые виджеты</h2><p>В стиле Elementor Basic: разделитель, галерея, карта и др. (вкладки и аккордеон — в блоке «Аккордеон» слева).</p></section>`,
        });
        editor.BlockManager.add("lemnity-more", {
          label: "Ещё",
          category: "Секции",
          content: `<section class="lemnity-section"><h2>Ещё</h2><p>Клик — дополнительные подсказки и макеты в панели справа.</p></section>`,
        });
        editor.BlockManager.add("lemnity-zero-block", {
          label: "Нулевой блок",
          category: "Секции",
          content: `<section class="lemnity-section lemnity-zero-block" data-gjs-name="Нулевой блок" style="position:relative;min-height:min(520px,78vh);width:100%;margin:0;overflow:visible;box-sizing:border-box;background:#fff;border:1px solid #e2e8f0"><div class="lemnity-zero-canvas" data-ln-zero-canvas="1" data-gjs-name="Zero canvas" style="position:relative;width:100%;min-height:100%;box-sizing:border-box"></div></section>`,
        });
        editor.BlockManager.add("image", {
          label: "Изображение",
          category: "Медиа",
          content: `<img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72" alt="" style="max-width: 100%; border-radius: 24px;" />`,
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

        const attachCarouselNavToIframe = () => {
          const win = editor.Canvas.getFrameEl()?.contentWindow ?? undefined;
          attachLemnityCarouselNavToCanvasFrame(win);
          attachLemnityAnchorsToCanvasFrame(win);
          attachLemnityDetailsTabsToCanvasFrame(win);
          mountZeroBlockUiInFrame(editor, win, zeroInlineUiRef.current);
          detachZeroBlockRuntime?.();
          detachZeroBlockRuntime = attachZeroBlockEditorRuntime(
            editor,
            win,
            () => onOpenZeroBlockEditorRef.current,
            zeroInlineUiRef.current,
          );
        };

        editor.on("canvas:frame:load:body", (payload: unknown) => {
          const frameWin = (payload as { window?: Window })?.window;
          const win = frameWin ?? editor.Canvas.getFrameEl()?.contentWindow ?? undefined;
          injectLemnityBoxSectionMotionIntoCanvas(win);
          attachLemnityCarouselNavToCanvasFrame(win);
          attachLemnityAnchorsToCanvasFrame(win);
          attachLemnityDetailsTabsToCanvasFrame(win);
          mountZeroBlockUiInFrame(editor, win, zeroInlineUiRef.current);
          detachZeroBlockRuntime?.();
          detachZeroBlockRuntime = attachZeroBlockEditorRuntime(
            editor,
            win,
            () => onOpenZeroBlockEditorRef.current,
            zeroInlineUiRef.current,
          );
        });

        const wireInstantTooltips = () => applyLemnityBoxInstantPanelTooltips(editor, containerRef.current);

        const mountLemnityBlocksToolbarButton = () => {
          const devicesPanel = editor.Panels.getPanel("devices-c");
          if (!devicesPanel || editor.Panels.getButton("devices-c", "lemnity-blocks-toggle")) return;
          const blocksToolbarTitle = String(editor.t("panels.buttons.titles.lemnity-blocks-toolbar"));
          editor.Panels.addButton("devices-c", {
            id: "lemnity-blocks-toggle",
            className: "gjs-pn-btn lemnity-box-blocks-toolbar-btn",
            command: "open-blocks",
            label: `<span class="lemnity-box-blocks-toolbar-icon" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></span>`,
            attributes: {
              title: blocksToolbarTitle,
              "aria-label": blocksToolbarTitle,
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
            .querySelectorAll<HTMLElement>(
              ".gjs-pn-devices-c .gjs-pn-buttons > .gjs-pn-btn:not(.lemnity-box-blocks-toolbar-btn)"
            )
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

            const frameDoc = editor.Canvas.getFrameEl()?.contentDocument;
            if (frameDoc?.documentElement) {
              writePageGridToDoc(frameDoc.documentElement, bootstrapDocument.gridConfig ?? PAGE_GRID_DEFAULTS);
            }

            injectLemnityBoxSectionMotionIntoCanvas(editor.Canvas.getFrameEl()?.contentWindow ?? undefined);
            mountZeroBlockUiInFrame(editor, editor.Canvas.getFrameEl()?.contentWindow ?? undefined, zeroInlineUiRef.current);
            wireInstantTooltips();
            const bmCats = editor.BlockManager.getCategories() as unknown as {
              models?: Array<{ set(k: string, v: unknown): void }>;
            };
            bmCats.models?.forEach((cat) => cat.set("open", false));

            detachBlocksAsideInsetRef.current = attachBlocksAsideInset(editor);
            detachRightPanelsOverlay?.();
            detachRightPanelsOverlay = attachLemnityBoxEditorRightPanelsOverlay(editor, () => containerRef.current);
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

            if (autoActivateZeroBlock) {
              const firstSection = frameDoc?.querySelector<HTMLElement>("section.lemnity-zero-block");
              if (firstSection) {
                ensureZeroBlockUi(firstSection);
                firstSection.setAttribute("data-ln-zero-editing", "1");
              }
            }
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
      detachRightPanelsOverlay?.();
      detachScopedStyles?.();
      detachSectionWidthGrid?.();
      detachBlockSettings?.();
      detachElementTraits?.();
      detachLayerActions?.();
      detachZeroBlockRuntime?.();
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
      <div
        ref={containerRef}
        className="lemnity-box-gjs-mount relative z-0 h-full min-h-[240px] min-w-0 flex-1"
      />
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

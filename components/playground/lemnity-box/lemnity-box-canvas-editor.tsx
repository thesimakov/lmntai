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
import { attachLemnityBoxHtmlEmbed } from "@/components/playground/lemnity-box/lemnity-box-html-embed-component";
import { attachLemnityBoxSectionWidthGrid } from "@/components/playground/lemnity-box/lemnity-box-section-width-grid";
import { attachLemnityBoxCanvasViewportGuides } from "@/components/playground/lemnity-box/lemnity-box-canvas-viewport-guides";
import { attachLemnityBoxLayerActions } from "@/components/playground/lemnity-box/lemnity-box-layer-actions";
import { attachLemnityBoxStyleManagerChoiceDropdowns } from "@/components/playground/lemnity-box/lemnity-box-style-manager-dropdowns";
import { mountPlaygroundBoxDeviceMenu } from "@/components/playground/lemnity-box/lemnity-box-device-dock-menu";
import { registerLemnityBoxToolbarSiblingMoves } from "@/components/playground/lemnity-box/lemnity-box-toolbar-sibling-moves";
import { registerLemnityBoxBlockSettingsToolbar } from "@/components/playground/lemnity-box/lemnity-box-toolbar-block-settings-modal";
import type { BlockNode, JsonStyle, LemnityBoxCanvasContent, PageDocument, ZeroElement } from "@/lib/lemnity-box-editor-schema";
import type { BoxImageLibraryResponse } from "@/lib/box-image-library-types";
import { lemnityBoxEditorMessagesRu } from "@/lib/lemnity-box-locale-ru";
import { attachLemnityCarouselNavToCanvasFrame } from "@/lib/lemnity-carousel-nav-runtime";
import { attachLemnityDetailsTabsToCanvasFrame } from "@/lib/lemnity-details-tabs-runtime";
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

const ZERO_BLOCK_RUNTIME_STYLE_ID = "lemnity-zero-block-runtime-style";
type ZeroBlockInsertKind =
  | "text"
  | "image"
  | "shape"
  | "button"
  | "video"
  | "html"
  | "tooltip"
  | "form"
  | "gallery";

function ensureZeroBlockRuntimeStyles(doc: Document) {
  if (doc.getElementById(ZERO_BLOCK_RUNTIME_STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = ZERO_BLOCK_RUNTIME_STYLE_ID;
  style.textContent = `
.lemnity-zero-block{position:relative}
.lemnity-zero-block [data-ln-zero-ui="toolbar"]{position:sticky;top:0;left:0;z-index:32;display:flex;justify-content:flex-end;padding:10px 12px;background:linear-gradient(180deg,rgba(248,250,252,.98),rgba(248,250,252,.72));border-bottom:1px dashed #dbe3ef}
.lemnity-zero-block [data-ln-zero-ui="toolbar"] button{pointer-events:auto}
.lemnity-zero-block [data-ln-zero-edit]{border:1px solid #cbd5e1;border-radius:9px;background:#fff;padding:8px 12px;font:600 13px/1.1 system-ui,sans-serif;color:#0f172a;cursor:pointer}
.lemnity-zero-block [data-ln-zero-edit]:hover{background:#f8fafc}
.lemnity-zero-block [data-ln-zero-ui="backdrop"]{display:none}
.lemnity-zero-block [data-ln-zero-ui="menu"]{display:none}
.lemnity-zero-block [data-ln-zero-ui="inspector"]{display:none}
.lemnity-zero-block[data-ln-zero-editing="1"]{position:fixed!important;inset:6vh 5vw auto 5vw!important;height:88vh!important;max-height:88vh!important;min-height:560px!important;z-index:10020!important;overflow:auto!important;box-shadow:0 26px 80px rgba(15,23,42,.32);border-radius:16px;border:1px solid #d5deeb;background-color:#fff}
.lemnity-zero-block[data-ln-zero-editing="1"] [data-ln-zero-ui="backdrop"]{display:block;position:fixed;inset:0;z-index:-1;background:rgba(15,23,42,.42)}
.lemnity-zero-block[data-ln-zero-editing="1"] [data-ln-zero-ui="menu"]{display:flex;position:fixed;left:calc(5vw + 20px);top:calc(6vh + 16px);z-index:36;flex-direction:column;gap:10px}
.lemnity-zero-block[data-ln-zero-editing="1"] [data-ln-zero-ui="inspector"]{display:block;position:fixed;right:calc(5vw + 20px);top:calc(6vh + 16px);z-index:36;width:268px;max-width:min(88vw,268px);border:1px solid #d5deeb;border-radius:12px;background:#fff;box-shadow:0 14px 34px rgba(15,23,42,.2);padding:12px}
.lemnity-zero-block [data-ln-zero-plus]{width:80px;height:80px;border:none;border-radius:999px;background:#f26b4f;color:#fff;font-size:54px;line-height:1;cursor:pointer;box-shadow:0 16px 38px rgba(242,107,79,.33)}
.lemnity-zero-block [data-ln-zero-plus]:hover{transform:translateY(-1px)}
.lemnity-zero-block [data-ln-zero-ui="picker"]{display:none;width:390px;max-width:min(90vw,390px);background:#fff;border:1px solid #d7dde7;border-radius:12px;box-shadow:0 18px 45px rgba(15,23,42,.2);padding:14px 0}
.lemnity-zero-block[data-ln-zero-menu-open="1"] [data-ln-zero-ui="picker"]{display:block}
.lemnity-zero-block [data-ln-zero-row]{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 18px}
.lemnity-zero-block [data-ln-zero-add]{width:100%;display:flex;align-items:center;justify-content:space-between;background:transparent;border:none;color:#0f172a;font:500 40px/1.2 system-ui,sans-serif;cursor:pointer;padding:3px 0}
.lemnity-zero-block [data-ln-zero-add] span:last-child{font-size:12px;font-weight:700;color:#9ca3af;border:1px solid #e5e7eb;border-radius:7px;padding:3px 8px;min-width:24px;text-align:center}
.lemnity-zero-block [data-ln-zero-sep]{height:1px;background:#edf1f6;margin:7px 0}
.lemnity-zero-block [data-ln-zero-inspector-title]{margin:0 0 10px;color:#0f172a;font:700 13px/1.2 system-ui,sans-serif}
.lemnity-zero-block [data-ln-zero-grid]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.lemnity-zero-block [data-ln-zero-field-wrap]{display:flex;flex-direction:column;gap:5px}
.lemnity-zero-block [data-ln-zero-field-wrap] label{font:600 11px/1 system-ui,sans-serif;color:#64748b;letter-spacing:.02em}
.lemnity-zero-block [data-ln-zero-field]{height:34px;border:1px solid #d5deeb;border-radius:8px;padding:0 9px;font:600 13px/1 system-ui,sans-serif;color:#0f172a;background:#fff}
.lemnity-zero-block [data-ln-zero-field]:disabled{background:#f8fafc;color:#94a3b8}
`;
  doc.head.appendChild(style);
}

function findZeroBlockModelByElement(editor: Editor, sectionEl: HTMLElement): Component | null {
  const sections = editor.getWrapper()?.find?.("section.lemnity-zero-block") ?? [];
  for (const section of sections as Component[]) {
    if (section.getEl?.() === sectionEl) return section;
  }
  return null;
}

function nextZeroBlockCoordinates(sectionEl: HTMLElement): { top: number; left: number } {
  const children = Array.from(sectionEl.children).filter((node) => {
    if (!(node instanceof HTMLElement)) return false;
    if (node.getAttribute("data-ln-editor-hint") === "1") return false;
    return true;
  });
  const idx = children.length;
  return { top: 120 + idx * 28, left: 32 + (idx % 5) * 14 };
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
  return `<div style="position:absolute;top:${top}px;left:${left}px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;width:320px;"><img src="https://images.unsplash.com/photo-1497366754035-f200968a6e72" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;" /><img src="https://images.unsplash.com/photo-1489515217757-5fd1be406fef" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;" /><img src="https://images.unsplash.com/photo-1504384308090-c894fdcc538d" alt="" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:10px;" /></div>`;
}

function appendZeroBlockElement(editor: Editor, sectionEl: HTMLElement, kind: ZeroBlockInsertKind) {
  const sectionModel = findZeroBlockModelByElement(editor, sectionEl);
  if (!sectionModel) return;
  const { top, left } = nextZeroBlockCoordinates(sectionEl);
  sectionModel.append(zeroBlockMarkup(kind, top, left) as never);
  editor.select(sectionModel);
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

function attachZeroBlockEditorRuntime(editor: Editor, win?: Window): () => void {
  const doc = win?.document;
  if (!doc) return () => {};
  ensureZeroBlockRuntimeStyles(doc);

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
  };

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null;
    if (!target) return;

    const editButton = target.closest<HTMLElement>("[data-ln-zero-edit]");
    if (editButton) {
      event.preventDefault();
      event.stopPropagation();
      const section = editButton.closest<HTMLElement>("section.lemnity-zero-block");
      if (!section) return;
      if (section.getAttribute("data-ln-zero-editing") === "1") {
        section.removeAttribute("data-ln-zero-editing");
        section.removeAttribute("data-ln-zero-menu-open");
        return;
      }
      closeAllZeroBlockEditors(doc);
      section.setAttribute("data-ln-zero-editing", "1");
      section.setAttribute("data-ln-zero-menu-open", "0");
      const sectionModel = findZeroBlockModelByElement(editor, section);
      if (sectionModel) editor.select(sectionModel);
      queueMicrotask(syncInspectorUi);
      return;
    }

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

    const activeSection = doc.querySelector<HTMLElement>("section.lemnity-zero-block[data-ln-zero-editing='1']");
    if (!activeSection) return;
    if (!activeSection.contains(target)) return;
    if (target.closest("[data-ln-zero-ui]")) return;
    let node: HTMLElement | null = target;
    while (node && node.parentElement !== activeSection) {
      node = node.parentElement;
    }
    if (!node) return;
    const sectionModel = findZeroBlockModelByElement(editor, activeSection);
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
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    closeAllZeroBlockEditors(doc);
  };

  const onInput = (event: Event) => {
    const target = event.target as HTMLInputElement | null;
    if (!target || target.tagName !== "INPUT") return;
    const key = target.getAttribute("data-ln-zero-field");
    if (!key) return;
    const selected = readSelectedForActiveSection();
    if (!selected) return;
    const value = Number.parseFloat(target.value);
    if (!Number.isFinite(value)) return;
    const stylePatch: Record<string, string> = { position: "absolute" };
    if (key === "x") stylePatch.left = `${Math.round(value)}px`;
    else if (key === "y") stylePatch.top = `${Math.round(value)}px`;
    else if (key === "w") stylePatch.width = `${Math.max(1, Math.round(value))}px`;
    else if (key === "h") stylePatch.height = `${Math.max(1, Math.round(value))}px`;
    selected.addStyle(stylePatch);
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
  if (!component) return false;
  if (String(component.get("tagName") ?? "").toLowerCase() !== "section") return false;
  return readComponentClasses(component).includes("lemnity-zero-block");
}

function hasZeroBlockAncestor(component: Component | null | undefined): boolean {
  let cursor = component;
  while (cursor) {
    if (isZeroBlockSectionComponent(cursor)) return true;
    cursor = cursor.parent?.() ?? null;
  }
  return false;
}

function placeZeroBlockChildFreely(component: Component) {
  const parent = component.parent?.();
  if (!parent || !isZeroBlockSectionComponent(parent)) return;
  if (String(component.get("tagName") ?? "").toLowerCase() === "style") return;
  if (component.getAttributes?.()["data-ln-editor-hint"] === "1") return;

  const siblings = parent.components?.();
  let order = 0;
  siblings?.forEach?.((child: Component) => {
    if (child === component) return;
    if (child.getAttributes?.()["data-ln-editor-hint"] === "1") return;
    if (String(child.get("tagName") ?? "").toLowerCase() === "style") return;
    order += 1;
  });

  const currentStyle = (component.getStyle?.() ?? {}) as Record<string, unknown>;
  const hasManualPlacement =
    currentStyle.position != null ||
    currentStyle.top != null ||
    currentStyle.left != null ||
    currentStyle.right != null ||
    currentStyle.bottom != null;

  if (hasManualPlacement) {
    if (String(currentStyle.position ?? "") !== "absolute") {
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
  if (isZeroBlockSectionComponent(root)) {
    root.components?.().forEach?.((child: Component) => {
      placeZeroBlockChildFreely(child);
    });
    return;
  }
  root.find("section.lemnity-zero-block").forEach((section) => {
    (section as Component).components?.().forEach?.((child: Component) => {
      placeZeroBlockChildFreely(child);
    });
  });
}

function ensureZeroBlockUi(sectionEl: HTMLElement) {
  if (sectionEl.querySelector("[data-ln-zero-ui='toolbar']")) return;

  const toolbar = sectionEl.ownerDocument.createElement("div");
  toolbar.setAttribute("data-ln-zero-ui", "toolbar");
  toolbar.setAttribute("data-ln-editor-hint", "1");
  toolbar.innerHTML =
    '<button type="button" data-ln-zero-edit="1" aria-label="Редактировать Zero Block">Редактировать</button>';

  const backdrop = sectionEl.ownerDocument.createElement("div");
  backdrop.setAttribute("data-ln-zero-ui", "backdrop");
  backdrop.setAttribute("data-ln-editor-hint", "1");
  backdrop.setAttribute("data-ln-zero-close", "1");

  const menu = sectionEl.ownerDocument.createElement("div");
  menu.setAttribute("data-ln-zero-ui", "menu");
  menu.setAttribute("data-ln-editor-hint", "1");
  menu.innerHTML = `
    <button type="button" data-ln-zero-plus="1" aria-label="Добавить элемент">+</button>
    <div data-ln-zero-ui="picker" role="menu" aria-label="Элементы Zero Block">
      <div data-ln-zero-row><button type="button" data-ln-zero-add="text">Текст<span>T</span></button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="image">Изображение<span>I</span></button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="shape">Шейп<span>R</span></button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="button">Кнопка<span>B</span></button></div>
      <div data-ln-zero-sep></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="video">Видео</button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="html">HTML</button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="tooltip">Тултип</button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="form">Форма</button></div>
      <div data-ln-zero-row><button type="button" data-ln-zero-add="gallery">Галерея</button></div>
    </div>`;

  const inspector = sectionEl.ownerDocument.createElement("div");
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

  sectionEl.prepend(menu);
  sectionEl.prepend(inspector);
  sectionEl.prepend(toolbar);
  sectionEl.prepend(backdrop);
}

function mountZeroBlockUiInFrame(editor: Editor, win?: Window) {
  const doc = win?.document;
  if (!doc) return;
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
    let detachScopedStyles: (() => void) | undefined;
    let detachSectionWidthGrid: (() => void) | undefined;
    let detachBlockSettings: (() => void) | undefined;
    let detachElementTraits: (() => void) | undefined;
    let detachLayerActions: (() => void) | undefined;
    let detachDeviceDock: (() => void) | undefined;
    let detachZeroBlockRuntime: (() => void) | undefined;

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
            (ed: Editor) => {
              attachLemnityBoxHtmlEmbed(ed);
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

            placeZeroBlockChildFreely(model);
            queueMicrotask(syncDragModeForSelection);

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
          label: "Zero Block",
          category: "Секции",
          content: `<section class="lemnity-section lemnity-zero-block" data-gjs-name="Zero Block" style="position:relative;min-height:min(520px,78vh);width:100%;margin:0;overflow:visible;box-sizing:border-box;background:#fff;background-image:linear-gradient(to right,#f1f5f9 1px,transparent 1px),linear-gradient(to bottom,#f1f5f9 1px,transparent 1px);background-size:22px 22px;border:1px solid #e2e8f0"><div data-ln-editor-hint="1" style="pointer-events:none;margin:0;padding:10px 14px;font-family:system-ui,sans-serif;font-size:12px;line-height:1.45;color:#64748b;text-align:center;border-bottom:1px dashed #e2e8f0;background:rgba(248,250,252,.97)">Зона свободной вёрстки (как Zero Block в Tilda): перетаскивайте элементы из каталога и при необходимости задайте им позицию в стилях.</div></section>`,
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
          attachLemnityDetailsTabsToCanvasFrame(win);
          mountZeroBlockUiInFrame(editor, win);
          detachZeroBlockRuntime?.();
          detachZeroBlockRuntime = attachZeroBlockEditorRuntime(editor, win);
        };

        editor.on("canvas:frame:load:body", (payload: unknown) => {
          const frameWin = (payload as { window?: Window })?.window;
          const win = frameWin ?? editor.Canvas.getFrameEl()?.contentWindow ?? undefined;
          injectLemnityBoxSectionMotionIntoCanvas(win);
          attachLemnityCarouselNavToCanvasFrame(win);
          attachLemnityDetailsTabsToCanvasFrame(win);
          mountZeroBlockUiInFrame(editor, win);
          detachZeroBlockRuntime?.();
          detachZeroBlockRuntime = attachZeroBlockEditorRuntime(editor, win);
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
            mountZeroBlockUiInFrame(editor, editor.Canvas.getFrameEl()?.contentWindow ?? undefined);
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

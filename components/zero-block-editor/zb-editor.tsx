"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useZbEditorStore } from "@/lib/zero-block-editor/store";
import { zbExportToHtml, zbExportToCss } from "@/lib/zero-block-editor/html-export";
import type { ZbElement, ZbCanvasConfig } from "@/lib/zero-block-editor/types";
import { ZbTopBar } from "./zb-top-bar";
import { ZbCanvas } from "./zb-canvas";
import { ZbAddPanel } from "./zb-add-panel";
import { ZbSettingsPanel } from "./zb-settings-panel";
import { ZbLayersPanel } from "./zb-layers-panel";
import { LemnityBoxSaveBlockDialog } from "@/components/playground/lemnity-box/lemnity-box-save-block-dialog";

export interface ZbEditorHandle {
  getHtmlCss: (blockId: string) => { html: string; css: string };
  getElements: () => ZbElement[];
  setElements: (els: ZbElement[]) => void;
}

interface Props {
  initialElements?: ZbElement[];
  canvasConfig?: Partial<ZbCanvasConfig>;
  onSave?: () => void;
  onClose?: () => void;
  editorRef?: React.RefObject<ZbEditorHandle | null>;
  projectId?: string | null;
}

export function ZbEditor({ initialElements, canvasConfig, onSave, onClose, editorRef, projectId }: Props) {
  const { setElements, updateCanvas, layersPanelOpen, settingsPanelOpen } = useZbEditorStore();
  const initialized = useRef(false);
  const [saveDialogData, setSaveDialogData] = useState<{ htmlContent: string; cssContent: string } | null>(null);

  function handleSaveToLibrary() {
    const { elements, canvas } = useZbEditorStore.getState();
    const html = zbExportToHtml(elements, canvas, "");
    const css = zbExportToCss(elements);
    setSaveDialogData({ htmlContent: html, cssContent: css });
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    if (canvasConfig) updateCanvas(canvasConfig);
    if (initialElements) setElements(initialElements);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Expose imperative handle
  useEffect(() => {
    if (!editorRef) return;
    const store = useZbEditorStore.getState();
    (editorRef as React.MutableRefObject<ZbEditorHandle>).current = {
      getHtmlCss: (blockId) => {
        const { elements, canvas } = useZbEditorStore.getState();
        return {
          html: zbExportToHtml(elements, canvas, blockId),
          css: zbExportToCss(elements),
        };
      },
      getElements: () => useZbEditorStore.getState().elements,
      setElements: (els) => store.setElements(els),
    };
  });

  // Global hotkeys
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

    const store = useZbEditorStore.getState();

    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
      e.preventDefault();
      store.undo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
      e.preventDefault();
      store.redo();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      if (store.selectedIds.length > 0) store.copyElements(store.selectedIds);
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "v") {
      e.preventDefault();
      store.pasteElements();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "d") {
      e.preventDefault();
      if (store.selectedIds.length > 0) store.duplicateElements(store.selectedIds);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      if (store.selectedIds.length > 0) {
        store.removeElements(store.selectedIds);
      }
      return;
    }
    if (e.key === "Escape") {
      store.clearSelection();
      return;
    }
    // Arrow key nudge
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      const delta = e.shiftKey ? 10 : 1;
      const dx = e.key === "ArrowLeft" ? -delta : e.key === "ArrowRight" ? delta : 0;
      const dy = e.key === "ArrowUp" ? -delta : e.key === "ArrowDown" ? delta : 0;
      store.selectedIds.forEach((id) => {
        const el = store.elements.find((e) => e.id === id);
        if (el && !el.locked) store.updateElement(id, { x: el.x + dx, y: el.y + dy });
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[#f0f0f0]" style={{ fontFamily: "Inter, sans-serif" }}>
      <ZbTopBar onSave={onSave} onClose={onClose} onSaveToLibrary={handleSaveToLibrary} />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <ZbAddPanel />
        {layersPanelOpen && <ZbLayersPanel />}
        <ZbCanvas />
        {settingsPanelOpen && <ZbSettingsPanel />}
      </div>
      {saveDialogData ? (
        <LemnityBoxSaveBlockDialog
          htmlContent={saveDialogData.htmlContent}
          cssContent={saveDialogData.cssContent}
          blockType="zero"
          projectId={projectId}
          onSaved={() => setSaveDialogData(null)}
          onClose={() => setSaveDialogData(null)}
        />
      ) : null}
    </div>
  );
}

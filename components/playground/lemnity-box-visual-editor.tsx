"use client";

import { forwardRef, useMemo, type RefObject } from "react";
import {
  LemnityBoxCanvasEditor,
  type LemnityBoxCanvasEditorHandle,
  type LemnityBoxCanvasEditorProps
} from "@/components/playground/lemnity-box/lemnity-box-canvas-editor";
import type { PageDocument } from "@/lib/lemnity-box-editor-schema";
import { emptyPageDocument } from "@/lib/lemnity-box-editor-schema";
import { readLemnityBoxCanvasDraft } from "@/lib/lemnity-box-editor-persistence";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  onInitError?: () => void;
  onCanvasChange?: () => void;
  bootstrapDocument?: PageDocument;
  blocksPanelOpen?: boolean;
  onBlocksPanelOpenChange?: (open: boolean) => void;
  /** Якорь в шапке для кнопок Grapes «Опции» (outline / preview / fullscreen / code). */
  canvasTopOptionsDockRef?: RefObject<HTMLDivElement | null>;
  /** Якорь в шапке для одного поля выбора вида (ПК / планшет / телефон). */
  canvasTopDeviceDockRef?: RefObject<HTMLDivElement | null>;
};

export type LemnityBoxVisualEditorHandle = LemnityBoxCanvasEditorHandle;

export const LemnityBoxVisualEditor = forwardRef<LemnityBoxVisualEditorHandle, Props>(function LemnityBoxVisualEditor(
  {
    className,
    onInitError,
    onCanvasChange,
    bootstrapDocument: bootstrapProp,
    blocksPanelOpen,
    onBlocksPanelOpenChange,
    canvasTopOptionsDockRef,
    canvasTopDeviceDockRef,
  },
  ref
) {
  const bootstrap = useMemo(() => {
    if (bootstrapProp) return bootstrapProp;
    const doc = emptyPageDocument("Lemnity Box");
    const draft = readLemnityBoxCanvasDraft();
    if (draft) {
      doc.grapesjs = draft;
    }
    return doc;
  }, [bootstrapProp]);

  const onChange: LemnityBoxCanvasEditorProps["onChange"] = () => {
    onCanvasChange?.();
  };

  const canvasProps: LemnityBoxCanvasEditorProps = {
    bootstrapDocument: bootstrap,
    onChange,
    onInitError,
    ...(canvasTopOptionsDockRef ? { canvasTopOptionsDockRef } : {}),
    ...(canvasTopDeviceDockRef ? { canvasTopDeviceDockRef } : {}),
    ...(typeof onBlocksPanelOpenChange === "function"
      ? { blocksPanelOpen: blocksPanelOpen ?? true, onBlocksPanelOpenChange }
      : {})
  };

  return (
    <div className={cn("flex min-h-0 w-full min-w-0 flex-1 flex-col", className)}>
      <LemnityBoxCanvasEditor ref={ref} {...canvasProps} />
    </div>
  );
});

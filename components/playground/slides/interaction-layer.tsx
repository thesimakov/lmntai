"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SlideElement, SlideElementFrame } from "@/lib/slide-graph/types";
import {
  SLIDE_CANVAS_W,
  SLIDE_CANVAS_H,
  clampFrame,
  defaultElementFrame,
} from "@/lib/slide-graph/freeform";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";

type Handle = "tl" | "tr" | "bl" | "br" | "tm" | "bm" | "ml" | "mr";

const HANDLE_CURSORS: Record<Handle, string> = {
  tl: "nw-resize", tr: "ne-resize",
  bl: "sw-resize", br: "se-resize",
  tm: "n-resize",  bm: "s-resize",
  ml: "w-resize",  mr: "e-resize",
};

function applyResizeHandle(orig: SlideElementFrame, handle: Handle, dx: number, dy: number): SlideElementFrame {
  let { x, y, w, h } = orig;
  if (handle.includes("l")) { x += dx; w -= dx; }
  if (handle.includes("r")) { w += dx; }
  if (handle.includes("t")) { y += dy; h -= dy; }
  if (handle.includes("b")) { h += dy; }
  return clampFrame({ ...orig, x, y, w: Math.max(24, w), h: Math.max(24, h) });
}

interface DragState {
  handle: Handle;
  startClientX: number;
  startClientY: number;
  origFrame: SlideElementFrame;
  elemId: string;
  slideId: string;
}

export interface InteractionLayerProps {
  slide: { id: string; elements: SlideElement[] };
  selectedElemId: string | null;
}

export function InteractionLayer({ slide, selectedElemId }: InteractionLayerProps) {
  const setIsDragging = useEditorStore((s) => s.setIsDragging);
  const dragRef = useRef<DragState | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

  const selectedEl = slide.elements.find((e) => e.id === selectedElemId) ?? null;
  const selectedIndex = selectedEl ? slide.elements.indexOf(selectedEl) : 0;
  const selectedFrame = selectedEl
    ? (selectedEl.frame ?? defaultElementFrame(selectedIndex, selectedEl.type))
    : null;

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent, handle: Handle) => {
      if (!selectedEl || !selectedFrame) return;
      e.preventDefault();
      e.stopPropagation();

      dragRef.current = {
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origFrame: { ...selectedFrame },
        elemId: selectedEl.id,
        slideId: slide.id,
      };
      setIsDragging(true);

      const onMove = (me: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const s = useEditorStore.getState().scale;
        const rawDx = (me.clientX - d.startClientX) / s;
        const rawDy = (me.clientY - d.startClientY) / s;
        const newFrame = applyResizeHandle(d.origFrame, d.handle, rawDx, rawDy);
        useEditorStore.getState().setSnapGuides([]);
        useSlideStore.getState().resizeElement(d.slideId, d.elemId, newFrame);
      };

      const onUp = () => {
        dragRef.current = null;
        setIsDragging(false);
        useEditorStore.getState().setSnapGuides([]);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        cleanupRef.current = null;
      };

      cleanupRef.current?.();
      cleanupRef.current = onUp;
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [selectedEl, selectedFrame, slide.id, setIsDragging]
  );

  if (!selectedEl || !selectedFrame) return null;

  const H = 10;
  const mid = (o: number, s: number) => o + s / 2 - H / 2;

  const handles: { id: Handle; left: number; top: number; corner: boolean }[] = [
    { id: "tl", left: selectedFrame.x - H / 2,                   top: selectedFrame.y - H / 2,                   corner: true  },
    { id: "tr", left: selectedFrame.x + selectedFrame.w - H / 2, top: selectedFrame.y - H / 2,                   corner: true  },
    { id: "bl", left: selectedFrame.x - H / 2,                   top: selectedFrame.y + selectedFrame.h - H / 2, corner: true  },
    { id: "br", left: selectedFrame.x + selectedFrame.w - H / 2, top: selectedFrame.y + selectedFrame.h - H / 2, corner: true  },
    { id: "tm", left: mid(selectedFrame.x, selectedFrame.w),      top: selectedFrame.y - H / 2,                   corner: false },
    { id: "bm", left: mid(selectedFrame.x, selectedFrame.w),      top: selectedFrame.y + selectedFrame.h - H / 2, corner: false },
    { id: "ml", left: selectedFrame.x - H / 2,                   top: mid(selectedFrame.y, selectedFrame.h),      corner: false },
    { id: "mr", left: selectedFrame.x + selectedFrame.w - H / 2, top: mid(selectedFrame.y, selectedFrame.h),      corner: false },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        width: SLIDE_CANVAS_W,
        height: SLIDE_CANVAS_H,
        zIndex: 100,
      }}
    >
      {/* Selection border */}
      <div
        style={{
          position: "absolute",
          left: selectedFrame.x,
          top: selectedFrame.y,
          width: selectedFrame.w,
          height: selectedFrame.h,
          boxShadow: "0 0 0 2px #3b82f6",
          pointerEvents: "none",
          zIndex: 101,
          boxSizing: "border-box",
          borderRadius: 1,
        }}
      />
      {/* Resize handles */}
      {handles.map(({ id, left, top, corner }) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left,
            top,
            width: H,
            height: H,
            background: "#ffffff",
            border: "2px solid #3b82f6",
            borderRadius: corner ? 3 : 2,
            cursor: HANDLE_CURSORS[id],
            pointerEvents: "all",
            zIndex: 102,
            boxSizing: "border-box",
            boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
          }}
          onPointerDown={(e) => onResizePointerDown(e, id)}
        />
      ))}
    </div>
  );
}

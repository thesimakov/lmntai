"use client";

import { useCallback, useRef } from "react";
import type { SlideElement, SlideElementFrame } from "@/lib/slide-graph/types";
import {
  SLIDE_CANVAS_W,
  SLIDE_CANVAS_H,
  clampFrame,
  defaultElementFrame,
} from "@/lib/slide-graph/freeform";
import { snapFrame } from "@/lib/slide-graph/snap-engine";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";

type Handle = "tl" | "tr" | "bl" | "br" | "tm" | "bm" | "ml" | "mr";

const HANDLE_CURSORS: Record<Handle, string> = {
  tl: "nw-resize",
  tr: "ne-resize",
  bl: "sw-resize",
  br: "se-resize",
  tm: "n-resize",
  bm: "s-resize",
  ml: "w-resize",
  mr: "e-resize",
};

function applyResizeHandle(
  orig: SlideElementFrame,
  handle: Handle,
  dx: number,
  dy: number
): SlideElementFrame {
  let { x, y, w, h } = orig;
  if (handle.includes("l")) { x += dx; w -= dx; }
  if (handle.includes("r")) { w += dx; }
  if (handle.includes("t")) { y += dy; h -= dy; }
  if (handle.includes("b")) { h += dy; }
  return clampFrame({ ...orig, x, y, w: Math.max(24, w), h: Math.max(24, h) });
}

interface DragState {
  type: "move" | Handle;
  startClientX: number;
  startClientY: number;
  origFrame: SlideElementFrame;
  elemId: string;
  slideId: string;
  moved: boolean;
}

export interface InteractionLayerProps {
  slide: { id: string; elements: SlideElement[] };
  selectedElemId: string | null;
}

export function InteractionLayer({ slide, selectedElemId }: InteractionLayerProps) {
  const scale = useEditorStore((s) => s.scale);
  const setSnapGuides = useEditorStore((s) => s.setSnapGuides);
  const setIsDragging = useEditorStore((s) => s.setIsDragging);

  const dragRef = useRef<DragState | null>(null);

  const selectedEl = slide.elements.find((e) => e.id === selectedElemId) ?? null;
  const selectedIndex = selectedEl ? slide.elements.indexOf(selectedEl) : 0;
  const selectedFrame = selectedEl
    ? (selectedEl.frame ?? defaultElementFrame(selectedIndex, selectedEl.type))
    : null;

  const otherFrames = slide.elements
    .filter((e) => e.id !== selectedElemId && e.frame)
    .map((e) => e.frame!);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, type: "move" | Handle) => {
      if (!selectedEl || !selectedFrame) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        type,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origFrame: { ...selectedFrame },
        elemId: selectedEl.id,
        slideId: slide.id,
        moved: false,
      };
      setIsDragging(true);
    },
    [selectedEl, selectedFrame, slide.id, setIsDragging]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const rawDx = (e.clientX - d.startClientX) / scale;
      const rawDy = (e.clientY - d.startClientY) / scale;
      if (!d.moved && Math.hypot(rawDx, rawDy) < 4 / scale) return;
      d.moved = true;

      let newFrame: SlideElementFrame;
      if (d.type === "move") {
        const tentative = clampFrame({
          ...d.origFrame,
          x: d.origFrame.x + rawDx,
          y: d.origFrame.y + rawDy,
        });
        const { frame, guides } = snapFrame(tentative, otherFrames, e.altKey);
        newFrame = frame;
        setSnapGuides(guides);
      } else {
        newFrame = applyResizeHandle(d.origFrame, d.type, rawDx, rawDy);
        setSnapGuides([]);
      }

      useSlideStore.getState().resizeElement(d.slideId, d.elemId, newFrame);
    },
    [scale, otherFrames, setSnapGuides]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    setSnapGuides([]);
  }, [setIsDragging, setSnapGuides]);

  if (!selectedEl || !selectedFrame) return null;

  const HANDLE_SIZE = 8;
  const mid = (origin: number, size: number) => origin + size / 2 - HANDLE_SIZE / 2;

  const handles: { id: Handle; left: number; top: number }[] = [
    { id: "tl", left: selectedFrame.x - HANDLE_SIZE / 2, top: selectedFrame.y - HANDLE_SIZE / 2 },
    { id: "tr", left: selectedFrame.x + selectedFrame.w - HANDLE_SIZE / 2, top: selectedFrame.y - HANDLE_SIZE / 2 },
    { id: "bl", left: selectedFrame.x - HANDLE_SIZE / 2, top: selectedFrame.y + selectedFrame.h - HANDLE_SIZE / 2 },
    { id: "br", left: selectedFrame.x + selectedFrame.w - HANDLE_SIZE / 2, top: selectedFrame.y + selectedFrame.h - HANDLE_SIZE / 2 },
    { id: "tm", left: mid(selectedFrame.x, selectedFrame.w), top: selectedFrame.y - HANDLE_SIZE / 2 },
    { id: "bm", left: mid(selectedFrame.x, selectedFrame.w), top: selectedFrame.y + selectedFrame.h - HANDLE_SIZE / 2 },
    { id: "ml", left: selectedFrame.x - HANDLE_SIZE / 2, top: mid(selectedFrame.y, selectedFrame.h) },
    { id: "mr", left: selectedFrame.x + selectedFrame.w - HANDLE_SIZE / 2, top: mid(selectedFrame.y, selectedFrame.h) },
  ];

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        width: SLIDE_CANVAS_W,
        height: SLIDE_CANVAS_H,
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Drag overlay on selected element */}
      <div
        style={{
          position: "absolute",
          left: selectedFrame.x,
          top: selectedFrame.y,
          width: selectedFrame.w,
          height: selectedFrame.h,
          cursor: "grab",
          pointerEvents: "all",
          zIndex: 1000,
        }}
        onPointerDown={(e) => onPointerDown(e, "move")}
      />

      {/* Resize handles */}
      {handles.map(({ id, left, top }) => (
        <div
          key={id}
          style={{
            position: "absolute",
            left,
            top,
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: "#fff",
            border: "1.5px solid #3b82f6",
            borderRadius: 2,
            cursor: HANDLE_CURSORS[id],
            pointerEvents: "all",
            zIndex: 1001,
            boxSizing: "border-box",
          }}
          onPointerDown={(e) => onPointerDown(e, id)}
        />
      ))}
    </div>
  );
}

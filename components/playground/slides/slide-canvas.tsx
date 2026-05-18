"use client";

import { useEffect, useCallback } from "react";
import type { Slide, SlideTheme } from "@/lib/slide-graph/types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, defaultElementFrame } from "@/lib/slide-graph/freeform";
import { buildSlideDeckStyles } from "@/lib/slide-graph/slide-deck-styles";
import { SlideElementRenderer } from "./slide-element-renderer";
import { useEditorStore } from "@/lib/stores/use-editor-store";

interface SlideCanvasProps {
  slide: Slide;
  theme: SlideTheme;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelectElement: (elemId: string) => void;
  onDeselectElement: () => void;
  selectedElemId: string | null;
}

export function SlideCanvas({
  slide,
  theme,
  containerRef,
  onSelectElement,
  onDeselectElement,
  selectedElemId,
}: SlideCanvasProps) {
  const styleId = "lmnt-canvas-styles";
  const setScale = useEditorStore((s) => s.setScale);
  const zoom = useEditorStore((s) => s.zoom);
  const scale = useEditorStore((s) => s.scale);

  // Inject scoped CSS once per theme change
  useEffect(() => {
    let tag = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = styleId;
      document.head.appendChild(tag);
    }
    tag.textContent = buildSlideDeckStyles(theme, "react");
  }, [theme]);

  // Update scale on container resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      const w = entry?.contentRect.width ?? el.clientWidth;
      setScale((w / SLIDE_CANVAS_W) * zoom);
    });
    obs.observe(el);
    setScale((el.clientWidth / SLIDE_CANVAS_W) * zoom);
    return () => obs.disconnect();
  }, [containerRef, setScale, zoom]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDeselectElement();
    },
    [onDeselectElement]
  );

  const backgroundStyle: React.CSSProperties = slide.background?.gradient
    ? { background: slide.background.gradient }
    : {
        backgroundColor: slide.background?.color ?? theme.backgroundColor,
        ...(slide.background?.image
          ? { backgroundImage: `url(${slide.background.image})`, backgroundSize: "cover" }
          : {}),
      };

  return (
    <div
      className="lmnt-canvas-root"
      style={{
        width: SLIDE_CANVAS_W,
        height: SLIDE_CANVAS_H,
        transform: `scale(${scale})`,
        transformOrigin: "top left",
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        position: "relative",
        flexShrink: 0,
      }}
      onClick={handleCanvasClick}
    >
      {/* Background */}
      <div
        className="lmnt-slide"
        style={{ position: "absolute", inset: 0, ...backgroundStyle }}
      />
      {/* Overlay */}
      {slide.background?.image && slide.background.overlay != null && (
        <div
          className="lmnt-slide__overlay"
          style={{
            position: "absolute",
            inset: 0,
            background: `rgba(0,0,0,${slide.background.overlay})`,
          }}
        />
      )}
      {/* Elements */}
      {slide.elements.map((el, i) => {
        if (el.visible === false) return null;
        const frame = el.frame ?? defaultElementFrame(i, el.type);
        const isSelected = el.id === selectedElemId;
        return (
          <div
            key={el.id}
            data-lmnt-frame-id={el.id}
            style={{
              position: "absolute",
              left: frame.x,
              top: frame.y,
              width: frame.w,
              height: frame.h,
              zIndex: frame.zIndex ?? i + 1,
              outline: isSelected ? "2px solid #3b82f6" : undefined,
              outlineOffset: isSelected ? "2px" : undefined,
              cursor: el.locked ? "default" : "grab",
              overflow: "hidden",
              boxSizing: "border-box",
              pointerEvents: el.locked ? "none" : undefined,
            }}
            onPointerDown={(e) => {
              if (el.locked) return;
              e.stopPropagation();
              onSelectElement(el.id);
            }}
          >
            <SlideElementRenderer el={el} />
          </div>
        );
      })}
    </div>
  );
}

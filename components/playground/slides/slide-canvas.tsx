"use client";

import { useEffect, useCallback, useRef } from "react";
import type { Slide, SlideTheme, SlideElement, SlideElementFrame } from "@/lib/slide-graph/types";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H, defaultElementFrame, clampFrame } from "@/lib/slide-graph/freeform";
import { isSlideElementLocked } from "@/lib/slide-graph/element-lock";
import { snapFrame } from "@/lib/slide-graph/snap-engine";
import { buildSlideDeckStyles } from "@/lib/slide-graph/slide-deck-styles";
import { SlideElementRenderer } from "./slide-element-renderer";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";

interface SlideCanvasProps {
  slide: Slide;
  theme: SlideTheme;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelectElement: (elemId: string) => void;
  /** LMB drag on empty slide area — pan the viewport (handled by parent). */
  onBackgroundPanPointerDown?: (e: React.PointerEvent) => void;
  selectedElemId: string | null;
  children?: React.ReactNode;
}

export function SlideCanvas({
  slide,
  theme,
  containerRef,
  onSelectElement,
  onBackgroundPanPointerDown,
  selectedElemId,
  children,
}: SlideCanvasProps) {
  const styleId = "lmnt-canvas-styles";
  const setScale = useEditorStore((s) => s.setScale);
  const zoom = useEditorStore((s) => s.zoom);
  const scale = useEditorStore((s) => s.scale);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => () => { cleanupRef.current?.(); }, []);

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

  // Fit canvas inside container with 48px margin
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const base = Math.min((w - 48) / SLIDE_CANVAS_W, (h - 48) / SLIDE_CANVAS_H);
      setScale(Math.max(0.05, base) * zoom);
    };
    const obs = new ResizeObserver(compute);
    obs.observe(el);
    compute();
    return () => obs.disconnect();
  }, [containerRef, setScale, zoom]);

  // Handles both selection AND drag initiation in one gesture
  const handleElementPointerDown = useCallback(
    (e: React.PointerEvent, el: SlideElement, frame: SlideElementFrame) => {
      e.stopPropagation();
      onSelectElement(el.id);

      const slideId = slide.id;
      const elemId = el.id;
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const origFrame = { ...frame };
      let moved = false;

      useEditorStore.getState().setIsDragging(true);

      const onMove = (me: PointerEvent) => {
        const s = useEditorStore.getState().scale;
        const rawDx = (me.clientX - startClientX) / s;
        const rawDy = (me.clientY - startClientY) / s;
        if (!moved && Math.hypot(rawDx, rawDy) < 3) return;
        moved = true;

        const tentative = clampFrame({ ...origFrame, x: origFrame.x + rawDx, y: origFrame.y + rawDy });
        const currentSlide = useSlideStore.getState().graph.slides.find((s) => s.id === slideId);
        const others = currentSlide?.elements.filter((e2) => e2.id !== elemId && e2.frame).map((e2) => e2.frame!) ?? [];
        const { frame: snapped, guides } = snapFrame(tentative, others, me.altKey);
        useEditorStore.getState().setSnapGuides(guides);
        useSlideStore.getState().resizeElement(slideId, elemId, snapped);
      };

      const onUp = () => {
        useEditorStore.getState().setIsDragging(false);
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
    [slide.id, onSelectElement]
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
    >
      {/* Background — clicking here deselects */}
      <div
        className="lmnt-slide"
        style={{ position: "absolute", inset: 0, ...backgroundStyle }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onBackgroundPanPointerDown?.(e);
        }}
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
          onPointerDown={(e) => {
            e.stopPropagation();
            onBackgroundPanPointerDown?.(e);
          }}
        />
      )}
      {/* Elements */}
      {slide.elements.map((el, i) => {
        if (el.visible === false) return null;
        const frame = el.frame ?? defaultElementFrame(i, el.type);
        const locked = isSlideElementLocked(el);
        return (
          <div
            key={el.id}
            className="lmnt-elem-frame"
            data-lmnt-frame-id={el.id}
            style={{
              left: frame.x,
              top: frame.y,
              width: frame.w,
              height: frame.h,
              zIndex: frame.zIndex ?? i + 1,
              cursor: locked ? "default" : "grab",
              pointerEvents: locked ? "none" : undefined,
            }}
            onPointerDown={(e) => {
              if (locked) return;
              handleElementPointerDown(e, el, frame);
            }}
          >
            <div className="lmnt-elem-frame__inner">
              <SlideElementRenderer el={el} />
            </div>
          </div>
        );
      })}
      {/* Overlays (interaction layer, snap guides, toolbar) share the scaled coordinate space */}
      {children}
    </div>
  );
}

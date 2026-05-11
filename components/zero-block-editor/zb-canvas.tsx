"use client";

import { useRef, useCallback, useState } from "react";
import { useZbEditorStore } from "@/lib/zero-block-editor/store";
import { computeZbSnap } from "@/lib/zero-block-editor/snap-engine";
import { computeColLayout } from "@/lib/zero-block-editor/breakpoints";

function buildColumnPositions(gridWidth: number, columns: number): number[] {
  const { margin, colW, gapW } = computeColLayout(columns, gridWidth);
  const pts: number[] = [margin, gridWidth - margin];
  for (let i = 0; i < columns; i++) {
    const start = margin + i * (colW + gapW);
    pts.push(start, start + colW);
  }
  return pts;
}
import { getEffectiveGeometry } from "@/lib/zero-block-editor/responsive";
import { ZbElementLayer } from "./zb-element-layer";
import { ZbSnapGuides } from "./zb-snap-guides";
import type { ZbResizeHandle } from "@/lib/zero-block-editor/types";

export type ContainerMode = "grid" | "window";

interface DragOp {
  elId: string;
  startPtX: number;
  startPtY: number;
  startPositions: Map<string, { x: number; y: number }>;
}

interface ResizeOp {
  elId: string;
  handle: ZbResizeHandle;
  startPtX: number;
  startPtY: number;
  startElX: number;
  startElY: number;
  startElW: number;
  startElH: number;
  aspectRatio: number;
}

interface CanvasResizeOp {
  startY: number;
  startH: number;
  zoom: number;
}

export function ZbCanvas() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragOp = useRef<DragOp | null>(null);
  const resizeOp = useRef<ResizeOp | null>(null);
  const canvasResizeOp = useRef<CanvasResizeOp | null>(null);
  const [containerMode, setContainerMode] = useState<ContainerMode>("grid");
  const [, forceRender] = useState(0);

  const {
    elements,
    selectedIds,
    canvas,
    breakpoint,
    selectIds,
    toggleSelection,
    clearSelection,
    updateElements,
    updateCanvas,
    setSnapGuides,
    setIsDragging,
    setIsResizing,
    pushHistory,
  } = useZbEditorStore();

  // Convert browser coords → canvas logical coords (accounts for zoom)
  const toCanvasPt = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left) / canvas.zoom,
        y: (clientY - rect.top) / canvas.zoom,
      };
    },
    [canvas.zoom],
  );

  // ── Canvas background click → deselect ──
  const onCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === canvasRef.current || e.target === e.currentTarget) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  // ── Element drag ──
  const onElementMouseDown = useCallback(
    (e: React.MouseEvent, elId: string) => {
      if (e.button !== 0) return;
      e.stopPropagation();

      const el = elements.find((el) => el.id === elId);
      if (!el || el.locked) return;

      // Alt+drag = duplicate then drag the copy
      let dragElId = elId;
      if (e.altKey) {
        pushHistory();
        const store = useZbEditorStore.getState();
        const maxZ = store.elements.reduce((m, e) => Math.max(m, e.zIndex), 0);
        const newId = `zb_${Date.now().toString(36)}_alt`;
        const newEl = { ...el, id: newId, zIndex: maxZ + 1 };
        useZbEditorStore.setState((s) => ({ elements: [...s.elements, newEl], selectedIds: [newId] }));
        dragElId = newId;
      } else if (e.shiftKey) {
        toggleSelection(elId);
      } else if (!selectedIds.includes(elId)) {
        selectIds([elId]);
      }

      const store = useZbEditorStore.getState();
      const bp = store.breakpoint;
      const dragEl = store.elements.find((e) => e.id === dragElId) ?? el;
      const eff = getEffectiveGeometry(dragEl, bp);
      const pt = toCanvasPt(e.clientX, e.clientY);
      if (!e.altKey) pushHistory();

      // Collect start positions for all selected elements (for multi-drag)
      const activeIds = e.altKey ? [dragElId] : Array.from(new Set([dragElId, ...store.selectedIds]));
      const startPositions = new Map<string, { x: number; y: number }>();
      for (const id of activeIds) {
        const target = store.elements.find((e) => e.id === id);
        if (target) {
          const g = getEffectiveGeometry(target, bp);
          startPositions.set(id, { x: g.x, y: g.y });
        }
      }
      // Ensure anchor is in the map
      startPositions.set(dragElId, { x: eff.x, y: eff.y });

      dragOp.current = {
        elId: dragElId,
        startPtX: pt.x,
        startPtY: pt.y,
        startPositions,
      };
      setIsDragging(true);

      const onMove = (me: MouseEvent) => {
        const op = dragOp.current;
        if (!op) return;
        const cur = toCanvasPt(me.clientX, me.clientY);
        const anchorStart = op.startPositions.get(op.elId) ?? { x: 0, y: 0 };
        const rawX = anchorStart.x + (cur.x - op.startPtX);
        const rawY = anchorStart.y + (cur.y - op.startPtY);
        const s = useZbEditorStore.getState();
        const movingEl = s.elements.find((e) => e.id === op.elId);
        if (!movingEl) return;
        const effMoving = getEffectiveGeometry(movingEl, s.breakpoint);
        const draggingIds = Array.from(op.startPositions.keys());
        const others = s.elements.filter((e) => !draggingIds.includes(e.id));
        const canvasEl = canvasRef.current;
        const snapW = canvasEl
          ? Math.max(1, canvasEl.getBoundingClientRect().width / s.canvas.zoom)
          : s.canvas.gridWidth;
        const colPositions = s.canvas.snapToGrid
          ? buildColumnPositions(s.canvas.gridWidth, s.canvas.columns)
          : undefined;
        const { x, y, guides } = computeZbSnap(
          { x: rawX, y: rawY, w: effMoving.w, h: effMoving.h },
          others,
          snapW,
          s.canvas.snapToGrid,
          s.canvas.snapToElements,
          8,
          colPositions,
        );
        const dx = Math.max(0, x) - anchorStart.x;
        const dy = Math.max(0, y) - anchorStart.y;

        if (draggingIds.length === 1) {
          // Single element — use existing path
          if (s.breakpoint === "desktop") {
            s.updateElement(op.elId, { x: Math.max(0, anchorStart.x + dx), y: Math.max(0, anchorStart.y + dy) });
          } else {
            s.updateElementResponsive(op.elId, s.breakpoint, { x: Math.max(0, anchorStart.x + dx), y: Math.max(0, anchorStart.y + dy) });
          }
        } else {
          // Multi-element: apply same delta to all
          const updates = Array.from(op.startPositions.entries()).map(([id, start]) => ({
            id,
            patch: { x: Math.max(0, start.x + dx), y: Math.max(0, start.y + dy) },
          }));
          if (s.breakpoint === "desktop") {
            s.updateElements(updates);
          } else {
            for (const { id, patch } of updates) {
              s.updateElementResponsive(id, s.breakpoint, patch);
            }
          }
        }
        setSnapGuides(guides);
      };

      const onUp = () => {
        dragOp.current = null;
        setIsDragging(false);
        setSnapGuides([]);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [elements, selectedIds, canvas, toCanvasPt, selectIds, toggleSelection, updateElements, setSnapGuides, setIsDragging, pushHistory],
  );

  // ── Element resize ──
  const onResizeMouseDown = useCallback(
    (e: React.MouseEvent, elId: string, handle: ZbResizeHandle) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      const el = elements.find((el) => el.id === elId);
      if (!el) return;

      const store = useZbEditorStore.getState();
      const bp = store.breakpoint;
      const eff = getEffectiveGeometry(el, bp);
      const pt = toCanvasPt(e.clientX, e.clientY);
      pushHistory();

      resizeOp.current = {
        elId, handle,
        startPtX: pt.x, startPtY: pt.y,
        startElX: eff.x, startElY: eff.y,
        startElW: eff.w, startElH: eff.h,
        aspectRatio: eff.w / Math.max(1, eff.h),
      };
      setIsResizing(true);
      forceRender((n) => n + 1);

      const MIN = 16;

      const onMove = (me: MouseEvent) => {
        const op = resizeOp.current;
        if (!op) return;
        const cur = toCanvasPt(me.clientX, me.clientY);
        const dx = cur.x - op.startPtX;
        const dy = cur.y - op.startPtY;
        let x = op.startElX, y = op.startElY, w = op.startElW, h = op.startElH;
        if (op.handle.includes("e")) w = Math.max(MIN, op.startElW + dx);
        if (op.handle.includes("s")) h = Math.max(MIN, op.startElH + dy);
        if (op.handle.includes("w")) {
          const nw = Math.max(MIN, op.startElW - dx);
          x = op.startElX + (op.startElW - nw);
          w = nw;
        }
        if (op.handle.includes("n")) {
          const nh = Math.max(MIN, op.startElH - dy);
          y = op.startElY + (op.startElH - nh);
          h = nh;
        }
        // Shift = proportional resize
        if (me.shiftKey) {
          const primaryH = op.handle.includes("n") || op.handle.includes("s");
          const primaryW = op.handle.includes("e") || op.handle.includes("w");
          if (primaryW && !primaryH) {
            h = Math.max(MIN, w / op.aspectRatio);
          } else {
            w = Math.max(MIN, h * op.aspectRatio);
          }
        }
        const s = useZbEditorStore.getState();
        if (s.breakpoint === "desktop") {
          s.updateElement(op.elId, { x, y, w, h });
        } else {
          s.updateElementResponsive(op.elId, s.breakpoint, { x, y, w, h });
        }
      };

      const onUp = () => {
        resizeOp.current = null;
        setIsResizing(false);
        forceRender((n) => n + 1);
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [elements, toCanvasPt, setIsResizing, pushHistory],
  );

  // ── Canvas height resize ──
  const onCanvasResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { canvas: c } = useZbEditorStore.getState();
      canvasResizeOp.current = { startY: e.clientY, startH: c.height, zoom: c.zoom };

      const onMove = (me: MouseEvent) => {
        const op = canvasResizeOp.current;
        if (!op) return;
        const dy = (me.clientY - op.startY) / op.zoom;
        const newH = Math.max(100, Math.round(op.startH + dy));
        useZbEditorStore.getState().updateCanvas({ height: newH });
      };

      const onUp = () => {
        canvasResizeOp.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [],
  );

  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  const canvasBg = canvas.backgroundImage
    ? `url(${canvas.backgroundImage}) center/cover no-repeat`
    : canvas.background;

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflow: "auto",
        background: "#cbcbcb",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      {/* Scroll area */}
      <div
        style={{
          flex: 1,
          padding: "32px 0 0 0",
          minHeight: canvas.height * canvas.zoom + 80,
          position: "relative",
        }}
      >
        {/* Canvas artboard wrapper */}
        <div
          style={{
            position: "relative",
            margin: "0 auto",
            width: canvas.canvasWidth ? canvas.canvasWidth * canvas.zoom : "100%",
            height: canvas.height * canvas.zoom,
            overflow: "visible",
          }}
        >
          {/* Actual canvas at logical size, scaled via transform */}
          <div
            ref={canvasRef}
            onMouseDown={onCanvasMouseDown}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: canvas.canvasWidth ?? (canvas.zoom !== 1 ? `${100 / canvas.zoom}%` : "100%"),
              height: canvas.height,
              minHeight: canvas.height,
              background: canvas.backgroundImage ? undefined : canvas.background,
              backgroundImage: canvas.backgroundImage ? `url(${canvas.backgroundImage})` : undefined,
              backgroundSize: canvas.backgroundImage ? "cover" : undefined,
              backgroundPosition: canvas.backgroundImage ? "center" : undefined,
              transform: `scale(${canvas.zoom})`,
              transformOrigin: "top left",
              boxShadow: "0 2px 20px rgba(0,0,0,0.18)",
              cursor: "default",
            }}
          >
            {/* Grid / window container guide overlay */}
            <GridZoneIndicator
              gridWidth={canvas.gridWidth}
              columns={canvas.columns}
              mode={containerMode}
            />

            {/* Elements */}
            {sorted.map((el) => (
              <ZbElementLayer
                key={el.id}
                element={el}
                selected={selectedIds.includes(el.id)}
                onMouseDown={(e) => onElementMouseDown(e, el.id)}
                onResizeHandleMouseDown={(e, handle) => onResizeMouseDown(e, el.id, handle)}
              />
            ))}

            {/* Snap guides */}
            <ZbSnapGuides />

            {/* Canvas height resize handle */}
            <div
              onMouseDown={onCanvasResizeMouseDown}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 10,
                cursor: "row-resize",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 300,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(0,0,0,0.18)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>

          {/* Height label next to canvas */}
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: -canvas.height * canvas.zoom + canvas.height * canvas.zoom - 4,
              top: canvas.height * canvas.zoom - 20,
              display: "flex",
              alignItems: "flex-end",
              paddingRight: 8,
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 10, color: "#888", fontFamily: "monospace" }}>
              {canvas.height}px
            </span>
          </div>
        </div>
      </div>

      {/* Container mode switcher */}
      <ContainerSwitcher mode={containerMode} onChange={setContainerMode} canvasHeight={canvas.height} />
    </div>
  );
}

// ── Grid zone indicator ───────────────────────────────────────────────────────

function GridZoneIndicator({
  gridWidth,
  columns,
  mode,
}: {
  gridWidth: number;
  columns: number;
  mode: ContainerMode;
}) {
  const { margin, colW, gapW } = computeColLayout(columns, gridWidth);

  return (
    <div
      className="pointer-events-none"
      style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: mode === "window" ? "100%" : gridWidth,
          maxWidth: "100%",
        }}
      >
        {mode === "grid" && (
          <>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: 1,
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(100,149,237,0.55) 0px, rgba(100,149,237,0.55) 4px, transparent 4px, transparent 8px)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                right: 0,
                width: 1,
                backgroundImage:
                  "repeating-linear-gradient(to bottom, rgba(100,149,237,0.55) 0px, rgba(100,149,237,0.55) 4px, transparent 4px, transparent 8px)",
              }}
            />
          </>
        )}

        {Array.from({ length: columns }).map((_, i) => {
          const left = margin + i * (colW + gapW);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left,
                width: colW,
                background: "rgba(100,149,237,0.04)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Container mode switcher ───────────────────────────────────────────────────

function ContainerSwitcher({
  mode,
  onChange,
  canvasHeight,
}: {
  mode: ContainerMode;
  onChange: (m: ContainerMode) => void;
  canvasHeight: number;
}) {
  return (
    <div
      style={{
        flexShrink: 0,
        height: 36,
        background: "#c0c0c0",
        borderTop: "1px solid #b0b0b0",
        display: "flex",
        alignItems: "center",
        paddingLeft: 16,
        gap: 0,
      }}
    >
      {(["window", "grid"] as ContainerMode[]).map((m, i) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            padding: "4px 14px",
            fontSize: 12,
            fontFamily: "Inter, sans-serif",
            background: mode === m ? "rgba(255,255,255,0.35)" : "transparent",
            color: mode === m ? "#1a1a1a" : "#555",
            border: "none",
            borderRight: i === 0 ? "1px solid #b0b0b0" : "none",
            cursor: "pointer",
            fontWeight: mode === m ? 600 : 400,
            height: "100%",
          }}
        >
          {m === "window" ? "window контейнер" : "grid контейнер"}
        </button>
      ))}

      <div style={{ flex: 1 }} />

      <div style={{ fontSize: 11, color: "#666", paddingRight: 12, fontFamily: "monospace" }}>
        {canvasHeight}px
      </div>
    </div>
  );
}

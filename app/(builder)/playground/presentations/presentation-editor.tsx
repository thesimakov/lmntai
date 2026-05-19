"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Loader2, ChevronLeft, ChevronRight,
  Plus, RefreshCw, ChevronUp, ChevronDown, X,
  Layers, List, Minus, MoreHorizontal,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";
import { PLAYGROUND_HOME_PROJECTS_HREF } from "@/lib/playground-project-edit-url";
import type { SlideGraph, Slide, SlideElement } from "@/lib/slide-graph/types";
import { renderSlide } from "@/lib/slide-graph/renderer";
import { buildSlideDeckStyles } from "@/lib/slide-graph/slide-deck-styles";
import { SLIDE_CANVAS_W, SLIDE_CANVAS_H } from "@/lib/slide-graph/freeform";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { SlideCanvas } from "@/components/playground/slides/slide-canvas";
import { InteractionLayer } from "@/components/playground/slides/interaction-layer";
import { SnapGuides } from "@/components/playground/slides/snap-guides";
import { FloatingToolbar } from "@/components/playground/slides/floating-toolbar";
import { LayersPanel } from "@/components/playground/slides/layers-panel";
import { AiInlineBar } from "@/components/playground/slides/ai-inline-bar";
import { ContextPanel } from "@/components/playground/slides/panels/context-panel";
import {
  SlideInsertToolbar,
  type SlideInsertTool,
} from "@/components/playground/slides/slide-insert-toolbar";
import {
  createImageElement,
  createLineElement,
  createShapeElement,
  createTextElement,
  type InsertLineKind,
  type InsertShapeKind,
  type InsertTextPreset,
} from "@/lib/slide-graph/create-element";

interface Props {
  projectId: string;
  initialGraph: SlideGraph;
  userPlan: string | null;
}

// ─── Design tokens (Gamma-inspired light theme) ───────────────────────────────
const G = {
  // Surfaces
  white:       "#ffffff",
  canvas:      "#f0f2f5",
  panelBorder: "#e2e8f0",
  hover:       "#f8fafc",
  // Text
  textPrimary: "#0f172a",
  textMuted:   "#64748b",
  textXMuted:  "#94a3b8",
  // Accent
  blue:        "#2563eb",
  blueBg:      "#eff6ff",
  blueBorder:  "#bfdbfe",
  // Slide shadow (Gamma uses soft ambient shadow)
  slideShadow: "0 2px 20px rgba(0,0,0,0.10), 0 0 0 1px rgba(0,0,0,0.06)",
};

// ─── Thumbnail ────────────────────────────────────────────────────────────────

const THUMB_W = 168;
const THUMB_H = Math.round(THUMB_W * 9 / 16);   // 94.5 → 95px
const THUMB_SCALE = THUMB_W / 960;

function SlideThumbnail({
  slide, theme, index, active, onClick, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, canDelete,
}: {
  slide: Slide;
  theme: SlideGraph["meta"]["theme"];
  index: number;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  canDelete: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = `<!DOCTYPE html><html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{width:960px;height:540px;overflow:hidden}
      ${buildSlideDeckStyles(theme, "embed")}
    </style></head><body>${renderSlide(slide, theme)}</body></html>`;
    doc.open(); doc.write(html); doc.close();
  }, [slide, theme]);

  return (
    <div
      className="group relative select-none"
      style={{
        background: active ? G.blueBg : "transparent",
        borderLeft: active ? `3px solid ${G.blue}` : "3px solid transparent",
        padding: "6px 10px 8px 9px",
        cursor: "pointer",
      }}
      onClick={onClick}
    >
      {/* Row: slide number + menu */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[10px] font-mono tabular-nums"
          style={{ color: active ? G.blue : G.textXMuted }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-0.5 hover:bg-black/8"
            style={{ color: G.textXMuted }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <div
              className="absolute right-0 top-5 z-50 rounded-lg py-1 min-w-[120px]"
              style={{
                background: G.white,
                border: `1px solid ${G.panelBorder}`,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {canMoveUp && (
                <button type="button" onClick={() => { onMoveUp(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: G.textPrimary }}>
                  <ChevronUp className="w-3 h-3" /> Вверх
                </button>
              )}
              {canMoveDown && (
                <button type="button" onClick={() => { onMoveDown(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: G.textPrimary }}>
                  <ChevronDown className="w-3 h-3" /> Вниз
                </button>
              )}
              {canDelete && (
                <>
                  <div style={{ borderTop: `1px solid ${G.panelBorder}`, margin: "2px 0" }} />
                  <button type="button" onClick={() => { onDelete(); setShowMenu(false); }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 flex items-center gap-2 text-red-500">
                    <X className="w-3 h-3" /> Удалить
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Thumbnail frame */}
      <div
        style={{
          width: THUMB_W,
          height: THUMB_H,
          position: "relative",
          overflow: "hidden",
          borderRadius: 6,
          boxShadow: active
            ? `0 0 0 2px ${G.blue}, 0 2px 8px rgba(0,0,0,0.12)`
            : "0 1px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.06)",
          background: "#fff",
          flexShrink: 0,
        }}
      >
        <iframe
          ref={iframeRef}
          title={`Слайд ${index + 1}`}
          className="absolute inset-0 pointer-events-none border-none"
          style={{
            width: "960px",
            height: "540px",
            transform: `scale(${THUMB_SCALE})`,
            transformOrigin: "top left",
          }}
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function PresentationEditorClient({ projectId, initialGraph, userPlan: _userPlan }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  // ── Stores ──
  const graph = useSlideStore((s) => s.graph);
  const setGraph = useSlideStore((s) => s.setGraph);
  const updateElement = useSlideStore((s) => s.updateElement);
  const deleteElement = useSlideStore((s) => s.deleteElement);
  const addElement = useSlideStore((s) => s.addElement);

  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const setActiveSlideIndex = useEditorStore((s) => s.setActiveSlideIndex);
  const selectedElemId = useEditorStore((s) => s.selectedElemId);
  const setSelectedElemId = useEditorStore((s) => s.setSelectedElemId);
  const leftTab = useEditorStore((s) => s.leftTab);
  const setLeftTab = useEditorStore((s) => s.setLeftTab);
  const snapGuides = useEditorStore((s) => s.snapGuides);
  const scale = useEditorStore((s) => s.scale);
  const zoom = useEditorStore((s) => s.zoom);
  const setZoom = useEditorStore((s) => s.setZoom);
  const setRightMode = useEditorStore((s) => s.setRightMode);

  // ── Local state ──
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);
  const [insertTool, setInsertTool] = useState<SlideInsertTool>("select");

  // ── Canvas pan/zoom ──
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panDragRef = useRef<{ startX: number; startY: number; startPan: { x: number; y: number } } | null>(null);
  const panGestureRef = useRef<{ didPan: boolean } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Init stores ──
  useEffect(() => {
    useSlideStore.getState().init(projectId, initialGraph);
    useEditorStore.getState().setActiveSlideIndex(0);
    useEditorStore.getState().setSelectedElemId(null);
    const first = initialGraph.slides[0];
    if (first) useSlideStore.getState().ensureFrames(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const slide = useSlideStore.getState().graph.slides[activeSlideIndex];
    if (slide) useSlideStore.getState().ensureFrames(slide.id);
  }, [activeSlideIndex]);

  // ── Center canvas on mount ──
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = containerRef.current;
      if (!el) return;
      const s = useEditorStore.getState().scale;
      setPan({
        x: Math.max(24, (el.clientWidth - SLIDE_CANVAS_W * s) / 2),
        y: Math.max(24, (el.clientHeight - SLIDE_CANVAS_H * s) / 2),
      });
    }, 60);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Wheel: zoom (Ctrl+scroll) or pan ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const { zoom: z } = useEditorStore.getState();
        const newZoom = Math.max(0.1, Math.min(4, z * factor));
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const ratio = newZoom / z;
        setPan((p) => ({ x: mx - (mx - p.x) * ratio, y: my - (my - p.y) * ratio }));
        useEditorStore.getState().setZoom(newZoom);
      } else {
        setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Pan drag (LMB on background or middle mouse) ──
  const beginPanPointer = useCallback(
    (e: React.PointerEvent, captureEl: HTMLElement) => {
      if (e.button !== 0 && e.button !== 1) return;
      e.preventDefault();
      panDragRef.current = { startX: e.clientX, startY: e.clientY, startPan: { ...pan } };
      panGestureRef.current = { didPan: false };
      setIsPanning(true);
      captureEl.setPointerCapture(e.pointerId);
    },
    [pan]
  );

  const handleContainerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button === 1) {
        beginPanPointer(e, e.currentTarget);
        return;
      }
      if (e.button === 0 && e.target === e.currentTarget) {
        beginPanPointer(e, e.currentTarget);
      }
    },
    [beginPanPointer]
  );

  const handleBackgroundPanPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      const container = containerRef.current;
      if (!container) return;
      beginPanPointer(e, container);
    },
    [beginPanPointer]
  );

  const handleContainerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = panDragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (panGestureRef.current && Math.hypot(dx, dy) > 4) {
      panGestureRef.current.didPan = true;
    }
    setPan({
      x: drag.startPan.x + dx,
      y: drag.startPan.y + dy,
    });
  }, []);

  const handleContainerPointerUp = useCallback(() => {
    if (panGestureRef.current && !panGestureRef.current.didPan) {
      setSelectedElemId(null);
    }
    panDragRef.current = null;
    panGestureRef.current = null;
    setIsPanning(false);
  }, [setSelectedElemId]);

  const activeSlide = graph.slides[activeSlideIndex] ?? graph.slides[0];

  const selectedEl = useMemo(
    () => activeSlide?.elements.find((e) => e.id === selectedElemId) ?? null,
    [activeSlide, selectedElemId]
  );
  const selectedElIndex = useMemo(
    () => (selectedEl ? (activeSlide?.elements.indexOf(selectedEl) ?? 0) : 0),
    [activeSlide, selectedEl]
  );

  const TEXT_TYPES = ["heading", "subheading", "body", "quote", "caption", "label"] as const;
  type TextType = typeof TEXT_TYPES[number];
  const showFloatingToolbar = selectedEl != null && (TEXT_TYPES as readonly string[]).includes(selectedEl.type);

  // ── Slide management ──
  const callManage = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/slides/manage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { graph?: SlideGraph; data?: { graph?: SlideGraph } };
      const nextGraph = data.graph ?? data.data?.graph;
      if (nextGraph) {
        setGraph(nextGraph);
        const idx = useEditorStore.getState().activeSlideIndex;
        const slide = nextGraph.slides[idx];
        if (slide) useSlideStore.getState().ensureFrames(slide.id);
      }
      return nextGraph;
    } finally { setSaving(false); }
  }, [projectId, setGraph]);

  const handleDeleteSlide = useCallback(async (slideId: string) => {
    if (!window.confirm("Удалить этот слайд?")) return;
    const newGraph = await callManage({ op: "delete", slideId });
    if (newGraph) setActiveSlideIndex(Math.min(activeSlideIndex, newGraph.slides.length - 1));
  }, [callManage, activeSlideIndex, setActiveSlideIndex]);

  const handleMoveSlide = useCallback(async (index: number, dir: "up" | "down") => {
    const slides = [...graph.slides];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    [slides[index], slides[target]] = [slides[target]!, slides[index]!];
    await callManage({ op: "reorder", slideIds: slides.map((s) => s.id) });
    setActiveSlideIndex(target);
  }, [graph.slides, callManage, setActiveSlideIndex]);

  const handleAddSlide = useCallback(async () => {
    if (!activeSlide) return;
    setAddingSlide(true);
    try {
      const prevSlides = graph.slides;
      const newGraph = await callManage({ op: "add", afterSlideId: activeSlide.id });
      if (newGraph) {
        const newIdx = newGraph.slides.findIndex((s) => !prevSlides.some((old) => old.id === s.id));
        if (newIdx !== -1) setActiveSlideIndex(newIdx);
      }
    } finally { setAddingSlide(false); }
  }, [callManage, activeSlide, graph.slides, setActiveSlideIndex]);

  const handleChangeTemplate = useCallback(async () => {
    if (!window.confirm("Создать новую презентацию? Текущая будет удалена.")) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/slides/patch`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
    } finally { setSaving(false); }
    router.refresh();
  }, [projectId, router]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/slides/export`, { method: "POST" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${graph.meta.title}.pptx`; a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  }, [projectId, graph.meta.title]);

  const handleToolbarUpdate = useCallback((patch: Partial<typeof selectedEl>) => {
    if (!activeSlide || !selectedEl) return;
    updateElement(activeSlide.id, selectedEl.id, patch as Parameters<typeof updateElement>[2]);
  }, [activeSlide, selectedEl, updateElement]);

  const handleToolbarDelete = useCallback(() => {
    if (!activeSlide || !selectedEl) return;
    deleteElement(activeSlide.id, selectedEl.id);
    setSelectedElemId(null);
  }, [activeSlide, selectedEl, deleteElement, setSelectedElemId]);

  const insertOnActiveSlide = useCallback(
    (element: SlideElement) => {
      if (!activeSlide) return;
      addElement(activeSlide.id, element);
      useSlideStore.getState().ensureFrames(activeSlide.id);
      setSelectedElemId(element.id);
      setRightMode("props");
    },
    [activeSlide, addElement, setSelectedElemId, setRightMode]
  );

  const handleInsertText = useCallback(
    (preset: InsertTextPreset) => {
      if (!activeSlide) return;
      insertOnActiveSlide(
        createTextElement(preset, activeSlide.elements.length, graph.meta.theme)
      );
    },
    [activeSlide, graph.meta.theme, insertOnActiveSlide]
  );

  const handleInsertImage = useCallback(() => {
    if (!activeSlide) return;
    insertOnActiveSlide(createImageElement(activeSlide.elements.length));
  }, [activeSlide, insertOnActiveSlide]);

  const handleInsertShape = useCallback(
    (kind: InsertShapeKind) => {
      if (!activeSlide) return;
      insertOnActiveSlide(
        createShapeElement(kind, activeSlide.elements.length, graph.meta.theme)
      );
    },
    [activeSlide, graph.meta.theme, insertOnActiveSlide]
  );

  const handleInsertLine = useCallback(
    (kind: InsertLineKind) => {
      if (!activeSlide) return;
      insertOnActiveSlide(
        createLineElement(kind, activeSlide.elements.length, graph.meta.theme)
      );
    },
    [activeSlide, graph.meta.theme, insertOnActiveSlide]
  );

  if (!activeSlide) return null;

  const zoomPct = Math.round(scale * 100);

  return (
    <div className="flex flex-col w-full h-full" style={{ background: G.white }}>

      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-2 px-4 shrink-0"
        style={{
          height: 48,
          background: G.white,
          borderBottom: `1px solid ${G.panelBorder}`,
        }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={() => router.push(PLAYGROUND_HOME_PROJECTS_HREF)}
          className="flex items-center gap-1.5 text-sm rounded-md px-2 py-1 transition-colors"
          style={{ color: G.textMuted }}
          onMouseEnter={(e) => (e.currentTarget.style.background = G.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{t("nav_projects")}</span>
        </button>

        <div style={{ width: 1, height: 20, background: G.panelBorder, margin: "0 4px" }} />

        {/* Title */}
        <span className="text-sm font-semibold truncate max-w-[240px]" style={{ color: G.textPrimary }}>
          {graph.meta.title}
        </span>

        <div className="flex-1" />

        <SlideInsertToolbar
          activeTool={insertTool}
          onToolChange={setInsertTool}
          onInsertText={handleInsertText}
          onInsertImage={handleInsertImage}
          onInsertShape={handleInsertShape}
          onInsertLine={handleInsertLine}
        />

        <div style={{ width: 1, height: 20, background: G.panelBorder, margin: "0 8px" }} />

        {/* Saving indicator */}
        {saving && (
          <span className="text-xs flex items-center gap-1.5" style={{ color: G.textXMuted }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Сохранение…
          </span>
        )}

        {/* Slide nav */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: `1px solid ${G.panelBorder}` }}
        >
          <button
            type="button"
            disabled={activeSlideIndex === 0}
            onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
            className="w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ color: G.textMuted }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = G.hover; }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span
            className="text-xs font-mono tabular-nums px-2"
            style={{ color: G.textMuted, borderLeft: `1px solid ${G.panelBorder}`, borderRight: `1px solid ${G.panelBorder}` }}
          >
            {activeSlideIndex + 1} / {graph.slides.length}
          </span>
          <button
            type="button"
            disabled={activeSlideIndex === graph.slides.length - 1}
            onClick={() => setActiveSlideIndex(Math.min(graph.slides.length - 1, activeSlideIndex + 1))}
            className="w-8 h-8 flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ color: G.textMuted }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.background = G.hover; }}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <button
          type="button"
          onClick={() => void handleChangeTemplate()}
          className="flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg transition-colors"
          style={{ color: G.textMuted, border: `1px solid ${G.panelBorder}` }}
          onMouseEnter={(e) => (e.currentTarget.style.background = G.hover)}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <RefreshCw className="w-3.5 h-3.5" /> Шаблон
        </button>
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={exporting}
          className="flex items-center gap-1.5 text-xs px-3 h-8 rounded-lg transition-colors disabled:opacity-50"
          style={{
            color: G.white,
            background: G.blue,
            border: `1px solid ${G.blue}`,
          }}
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PPTX
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left panel ── */}
        <div
          className="w-[200px] shrink-0 flex flex-col"
          style={{ background: G.white, borderRight: `1px solid ${G.panelBorder}` }}
        >
          {/* Tabs */}
          <div
            className="flex shrink-0"
            style={{ borderBottom: `1px solid ${G.panelBorder}` }}
          >
            {(["slides", "layers"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setLeftTab(tab)}
                className="flex-1 flex items-center justify-center gap-1.5 h-10 text-xs font-medium transition-colors"
                style={{
                  color: leftTab === tab ? G.blue : G.textMuted,
                  borderBottom: leftTab === tab ? `2px solid ${G.blue}` : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {tab === "slides" ? <List className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                {tab === "slides" ? "Слайды" : "Слои"}
              </button>
            ))}
          </div>

          {leftTab === "slides" && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-1">
              {graph.slides.map((slide, i) => (
                <SlideThumbnail
                  key={slide.id}
                  slide={slide}
                  theme={graph.meta.theme}
                  index={i}
                  active={i === activeSlideIndex}
                  onClick={() => { setActiveSlideIndex(i); setSelectedElemId(null); }}
                  onDelete={() => void handleDeleteSlide(slide.id)}
                  onMoveUp={() => void handleMoveSlide(i, "up")}
                  onMoveDown={() => void handleMoveSlide(i, "down")}
                  canMoveUp={i > 0}
                  canMoveDown={i < graph.slides.length - 1}
                  canDelete={graph.slides.length > 1}
                />
              ))}

              {/* Add slide */}
              <div style={{ padding: "4px 10px 10px" }}>
                <button
                  type="button"
                  onClick={() => void handleAddSlide()}
                  disabled={addingSlide}
                  className="w-full flex items-center justify-center gap-1.5 text-xs rounded-md h-8 transition-colors disabled:opacity-50"
                  style={{
                    width: THUMB_W,
                    border: `1.5px dashed ${G.panelBorder}`,
                    color: G.textXMuted,
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = G.blue;
                    (e.currentTarget as HTMLElement).style.color = G.blue;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = G.panelBorder;
                    (e.currentTarget as HTMLElement).style.color = G.textXMuted;
                  }}
                >
                  {addingSlide ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                  Слайд
                </button>
              </div>
            </div>
          )}

          {leftTab === "layers" && (
            <div className="flex-1 overflow-hidden">
              <LayersPanel slideId={activeSlide.id} elements={activeSlide.elements} />
            </div>
          )}
        </div>

        {/* ── Center: canvas viewport ── */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden relative select-none"
            style={{
              background: G.canvas,
              cursor: isPanning ? "grabbing" : "default",
            }}
            onPointerDown={handleContainerPointerDown}
            onPointerMove={handleContainerPointerMove}
            onPointerUp={handleContainerPointerUp}
          >
            {/* Canvas positioned by pan */}
            <div
              style={{
                position: "absolute",
                left: pan.x,
                top: pan.y,
                boxShadow: G.slideShadow,
                borderRadius: 4,
                overflow: "hidden",
                pointerEvents: isPanning ? "none" : "auto",
              }}
            >
              <SlideCanvas
                slide={activeSlide}
                theme={graph.meta.theme}
                containerRef={containerRef}
                onSelectElement={(id) => setSelectedElemId(id)}
                onBackgroundPanPointerDown={handleBackgroundPanPointerDown}
                selectedElemId={selectedElemId}
              >
                {selectedEl && <InteractionLayer slide={activeSlide} selectedElemId={selectedElemId} />}
                {snapGuides.length > 0 && <SnapGuides guides={snapGuides} />}
                {showFloatingToolbar && selectedEl && (
                  <FloatingToolbar
                    element={selectedEl}
                    elementIndex={selectedElIndex}
                    onUpdate={handleToolbarUpdate}
                    onDelete={handleToolbarDelete}
                  />
                )}
              </SlideCanvas>
            </div>

            {/* Zoom indicator */}
            <div
              className="absolute bottom-3 right-3 flex items-center gap-0.5 rounded-lg"
              style={{
                background: G.white,
                border: `1px solid ${G.panelBorder}`,
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                padding: "2px 4px",
              }}
            >
              <button
                type="button"
                onClick={() => setZoom(Math.max(0.1, zoom / 1.2))}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-gray-100"
                style={{ color: G.textMuted }}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span
                className="text-xs font-mono tabular-nums min-w-[38px] text-center cursor-pointer"
                style={{ color: G.textMuted }}
                onClick={() => setZoom(1)}
                title="Сбросить масштаб"
              >
                {zoomPct}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(Math.min(4, zoom * 1.2))}
                className="w-6 h-6 flex items-center justify-center rounded transition-colors hover:bg-gray-100"
                style={{ color: G.textMuted }}
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* Keyboard hint */}
            <div
              className="absolute bottom-3 left-3 text-[10px] pointer-events-none"
              style={{ color: G.textXMuted }}
            >
              ЛКМ на фоне — перемещение · Ctrl+scroll — масштаб
            </div>
          </div>

          {/* AI bar */}
          <AiInlineBar projectId={projectId} />
        </div>

        {/* ── Right: context panel ── */}
        <ContextPanel projectId={projectId} />
      </div>
    </div>
  );
}

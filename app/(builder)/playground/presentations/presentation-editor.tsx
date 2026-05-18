"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Loader2, ChevronLeft, ChevronRight,
  Plus, RefreshCw, ChevronUp, ChevronDown, X,
  Layers, List,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAYGROUND_HOME_PROJECTS_HREF } from "@/lib/playground-project-edit-url";
import type { SlideGraph, Slide } from "@/lib/slide-graph/types";
import { renderSlide } from "@/lib/slide-graph/renderer";
import { buildSlideDeckStyles } from "@/lib/slide-graph/slide-deck-styles";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { SlideCanvas } from "@/components/playground/slides/slide-canvas";
import { InteractionLayer } from "@/components/playground/slides/interaction-layer";
import { SnapGuides } from "@/components/playground/slides/snap-guides";
import { FloatingToolbar } from "@/components/playground/slides/floating-toolbar";
import { LayersPanel } from "@/components/playground/slides/layers-panel";
import { AiInlineBar } from "@/components/playground/slides/ai-inline-bar";
import { ContextPanel } from "@/components/playground/slides/panels/context-panel";

interface Props {
  projectId: string;
  initialGraph: SlideGraph;
  userPlan: string | null;
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const slideHtml = renderSlide(slide, theme);
    const html = `<!DOCTYPE html><html><head><style>${buildSlideDeckStyles(theme, "embed")}</style></head><body>${slideHtml}</body></html>`;
    doc.open(); doc.write(html); doc.close();
  }, [slide, theme]);

  return (
    <div className="group relative w-full shrink-0">
      <button
        type="button" onClick={onClick}
        className={cn(
          "relative w-full rounded-md overflow-hidden border-2 transition-all",
          active ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30"
        )}
        style={{ aspectRatio: "16/9" }}
      >
        <iframe
          ref={iframeRef} title={`Слайд ${index + 1}`}
          className="absolute inset-0 pointer-events-none"
          style={{ width: "960px", height: "540px", transform: "scale(var(--thumb-scale,0.15))", transformOrigin: "top left" }}
          sandbox="allow-same-origin"
        />
        <span className="absolute bottom-1 right-1.5 text-[9px] text-white/60 bg-black/30 px-1 rounded">{index + 1}</span>
      </button>
      <div className={cn("absolute right-0.5 top-0.5 flex flex-col gap-0.5 transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
        <button type="button" disabled={!canMoveUp} onClick={onMoveUp} className="w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
        <button type="button" disabled={!canMoveDown} onClick={onMoveDown} className="w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
        {canDelete && <button type="button" onClick={onDelete} className="w-5 h-5 rounded bg-red-500/70 text-white flex items-center justify-center hover:bg-red-600/80"><X className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function PresentationEditorClient({ projectId, initialGraph, userPlan: _userPlan }: Props) {
  const { t } = useI18n();
  const router = useRouter();

  // ── Store refs ──
  const graph = useSlideStore((s) => s.graph);
  const setGraph = useSlideStore((s) => s.setGraph);
  const updateElement = useSlideStore((s) => s.updateElement);
  const deleteElement = useSlideStore((s) => s.deleteElement);

  const activeSlideIndex = useEditorStore((s) => s.activeSlideIndex);
  const setActiveSlideIndex = useEditorStore((s) => s.setActiveSlideIndex);
  const selectedElemId = useEditorStore((s) => s.selectedElemId);
  const setSelectedElemId = useEditorStore((s) => s.setSelectedElemId);
  const leftTab = useEditorStore((s) => s.leftTab);
  const setLeftTab = useEditorStore((s) => s.setLeftTab);
  const snapGuides = useEditorStore((s) => s.snapGuides);

  // ── Local UI state ──
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [addingSlide, setAddingSlide] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // ── One-time store init ──
  useEffect(() => {
    useSlideStore.getState().init(projectId, initialGraph);
    useEditorStore.getState().setActiveSlideIndex(0);
    useEditorStore.getState().setSelectedElemId(null);
    const first = initialGraph.slides[0];
    if (first) useSlideStore.getState().ensureFrames(first.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Ensure frames whenever active slide changes ──
  useEffect(() => {
    const slide = graph.slides[activeSlideIndex];
    if (slide) useSlideStore.getState().ensureFrames(slide.id);
  }, [activeSlideIndex, graph.slides]);

  const activeSlide = graph.slides[activeSlideIndex] ?? graph.slides[0];

  // ── Selected element ──
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

  // ── Slide management API ──
  const callManage = useCallback(async (body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/slides/manage`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { graph?: SlideGraph; data?: { graph?: SlideGraph } };
      const nextGraph = data.graph ?? data.data?.graph;
      if (nextGraph) setGraph(nextGraph);
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

  // ── Export ──
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

  // ── FloatingToolbar handlers ──
  const handleToolbarUpdate = useCallback((patch: Partial<typeof selectedEl>) => {
    if (!activeSlide || !selectedEl) return;
    updateElement(activeSlide.id, selectedEl.id, patch as Parameters<typeof updateElement>[2]);
  }, [activeSlide, selectedEl, updateElement]);

  const handleToolbarDelete = useCallback(() => {
    if (!activeSlide || !selectedEl) return;
    deleteElement(activeSlide.id, selectedEl.id);
    setSelectedElemId(null);
  }, [activeSlide, selectedEl, deleteElement, setSelectedElemId]);

  if (!activeSlide) return null;

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-4 h-12 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push(PLAYGROUND_HOME_PROJECTS_HREF)}
        >
          <ArrowLeft className="w-4 h-4" /> {t("nav_projects")}
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <p className="text-sm font-medium truncate max-w-[260px]">{graph.meta.title}</p>
        <div className="flex-1" />
        {saving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Сохранение…</span>}
        <div className="flex items-center gap-1 border border-border rounded-md px-1">
          <button
            type="button"
            onClick={() => setActiveSlideIndex(Math.max(0, activeSlideIndex - 1))}
            disabled={activeSlideIndex === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium min-w-[52px] text-center">
            {activeSlideIndex + 1} / {graph.slides.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveSlideIndex(Math.min(graph.slides.length - 1, activeSlideIndex + 1))}
            disabled={activeSlideIndex === graph.slides.length - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => void handleChangeTemplate()}>
          <RefreshCw className="w-3.5 h-3.5" /> Шаблон
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => void handleExport()} disabled={exporting}>
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />} PPTX
        </Button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: 172px fixed */}
        <div className="w-[172px] shrink-0 border-r border-border bg-muted/20 flex flex-col">
          {/* Tab header */}
          <div className="flex border-b border-border shrink-0">
            <button
              type="button"
              onClick={() => setLeftTab("slides")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors border-b-2",
                leftTab === "slides"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <List className="w-3.5 h-3.5" /> Слайды
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("layers")}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold transition-colors border-b-2",
                leftTab === "layers"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="w-3.5 h-3.5" /> Слои
            </button>
          </div>

          {leftTab === "slides" && (
            <div className="flex-1 overflow-y-auto flex flex-col gap-2 p-2">
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
              <button
                type="button"
                onClick={() => void handleAddSlide()}
                disabled={addingSlide}
                className="w-full rounded-md border-2 border-dashed border-border/60 hover:border-primary/50 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                {addingSlide ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Слайд
              </button>
            </div>
          )}

          {leftTab === "layers" && (
            <div className="flex-1 overflow-hidden">
              <LayersPanel
                slideId={activeSlide.id}
                elements={activeSlide.elements}
              />
            </div>
          )}
        </div>

        {/* Center: canvas area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Canvas container */}
          <div
            ref={containerRef}
            className="flex-1 overflow-hidden bg-[#1a1a2e] relative flex items-start justify-start"
          >
            <SlideCanvas
              slide={activeSlide}
              theme={graph.meta.theme}
              containerRef={containerRef}
              onSelectElement={(id) => setSelectedElemId(id)}
              onDeselectElement={() => setSelectedElemId(null)}
              selectedElemId={selectedElemId}
            />
            {selectedEl && (
              <InteractionLayer
                slide={activeSlide}
                selectedElemId={selectedElemId}
              />
            )}
            {snapGuides.length > 0 && (
              <SnapGuides guides={snapGuides} />
            )}
            {showFloatingToolbar && selectedEl && (
              <FloatingToolbar
                element={selectedEl}
                elementIndex={selectedElIndex}
                onUpdate={handleToolbarUpdate}
                onDelete={handleToolbarDelete}
              />
            )}
          </div>

          {/* AI inline bar */}
          <AiInlineBar projectId={projectId} />
        </div>

        {/* Right: context panel */}
        <ContextPanel projectId={projectId} />
      </div>
    </div>
  );
}

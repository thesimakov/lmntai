"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlideGraph, Slide, SlideElement } from "@/lib/slide-graph/types";
import { renderSlide, renderSlideGraph } from "@/lib/slide-graph/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type Selection = { slideId: string; elemId: string } | null;

interface SlideVisualEditorProps {
  projectId: string;
  initialGraph: SlideGraph;
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function SlideThumbnail({
  slide,
  theme,
  index,
  active,
  onClick,
}: {
  slide: Slide;
  theme: SlideGraph["meta"]["theme"];
  index: number;
  active: boolean;
  onClick: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const html = `<!DOCTYPE html><html><head><style>
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{width:960px;height:540px;overflow:hidden;font-family:${theme.fontFamily};color:${theme.textColor}}
      .lmnt-slide{width:960px;height:540px;position:relative;overflow:hidden}
      .lmnt-slide__overlay{position:absolute;inset:0}
      .lmnt-slide__content{position:relative;z-index:1;height:100%;display:flex;flex-direction:column;justify-content:center;padding:48px 64px;gap:16px}
      .lmnt-slide__heading{font-size:2.25rem;font-weight:700;line-height:1.2}
      .lmnt-slide__subheading{font-size:1.25rem;opacity:.75}
      .lmnt-slide__body{font-size:1.1rem;line-height:1.7;opacity:.9}
      .lmnt-slide__bullets{font-size:1.1rem;line-height:1.7;padding-left:1.5em;opacity:.9}
      .lmnt-slide__bullets li{margin-bottom:8px}
      .lmnt-slide__bullets li::marker{color:${theme.primaryColor}}
      .lmnt-slide__image{width:100%;height:100%;object-fit:cover}
      .lmnt-slide__quote{font-size:1.5rem;font-style:italic;border-left:4px solid ${theme.primaryColor};padding-left:24px;opacity:.9}
      .lmnt-slide__caption{font-size:.875rem;opacity:.6}
      .lmnt-slide__label{font-size:.75rem;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:${theme.primaryColor}}
      .lmnt-slide--title .lmnt-slide__content{align-items:center;text-align:center}
      .lmnt-slide--title .lmnt-slide__heading{font-size:3rem}
      .lmnt-slide--section-divider .lmnt-slide__content{align-items:center;text-align:center}
      .lmnt-slide--section-divider .lmnt-slide__heading{font-size:2.5rem;color:${theme.primaryColor}}
      .lmnt-slide--two-column .lmnt-slide__content{flex-direction:row;gap:48px;align-items:flex-start}
    </style></head><body>${renderSlide(slide, theme)}</body></html>`;
    doc.open();
    doc.write(html);
    doc.close();
  }, [slide, theme]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative w-full rounded-md overflow-hidden border-2 transition-all shrink-0",
        active ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30"
      )}
      style={{ aspectRatio: "16/9" }}
    >
      <iframe
        ref={iframeRef}
        title={`Slide ${index + 1}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ transform: "scale(1)", transformOrigin: "top left" }}
        sandbox="allow-same-origin"
      />
      {/* Scale wrapper trick — scale iframe 960→full width */}
      <div className="absolute inset-0" style={{ background: "transparent" }} />
      <span className="absolute bottom-1 right-1.5 text-[9px] text-white/60 bg-black/30 px-1 rounded">
        {index + 1}
      </span>
    </button>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropertiesPanel({
  element,
  onUpdate,
  onClose,
}: {
  element: SlideElement;
  onUpdate: (patch: Partial<SlideElement>) => void;
  onClose: () => void;
}) {
  const isText =
    element.type === "heading" ||
    element.type === "subheading" ||
    element.type === "body" ||
    element.type === "quote" ||
    element.type === "caption" ||
    element.type === "label";

  const isList = element.type === "bullet-list";

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <p className="text-xs font-medium capitalize">{element.type.replace("-", " ")}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-xs px-1"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Text content */}
        {isText && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Текст
            </label>
            <textarea
              className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              value={element.content ?? ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
            />
          </div>
        )}

        {/* Bullet list */}
        {isList && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Пункты
            </label>
            {(element.items ?? []).map((item, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  value={item}
                  onChange={(e) => {
                    const newItems = [...(element.items ?? [])];
                    newItems[i] = e.target.value;
                    onUpdate({ items: newItems });
                  }}
                />
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-500 transition-colors"
                  onClick={() => {
                    const newItems = (element.items ?? []).filter((_, j) => j !== i);
                    onUpdate({ items: newItems });
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs gap-1 w-full"
              onClick={() => onUpdate({ items: [...(element.items ?? []), ""] })}
            >
              <Plus className="w-3 h-3" /> Добавить пункт
            </Button>
          </div>
        )}

        {/* Image src */}
        {element.type === "image" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              URL изображения
            </label>
            <input
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={element.src ?? ""}
              onChange={(e) => onUpdate({ src: e.target.value })}
            />
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Alt-текст
            </label>
            <input
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={element.alt ?? ""}
              onChange={(e) => onUpdate({ alt: e.target.value })}
            />
          </div>
        )}

        {/* Style controls */}
        <div className="space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Стиль
          </label>

          {/* Text align */}
          <div className="flex gap-1">
            {(["left", "center", "right"] as const).map((align) => {
              const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
              return (
                <button
                  key={align}
                  type="button"
                  onClick={() => onUpdate({ style: { ...element.style, textAlign: align } })}
                  className={cn(
                    "flex-1 h-7 rounded border border-border flex items-center justify-center transition-colors",
                    element.style?.textAlign === align
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* Bold / Italic */}
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  style: {
                    ...element.style,
                    fontWeight: element.style?.fontWeight === "bold" ? "normal" : "bold",
                  },
                })
              }
              className={cn(
                "flex-1 h-7 rounded border border-border flex items-center justify-center transition-colors",
                element.style?.fontWeight === "bold"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                onUpdate({
                  style: {
                    ...element.style,
                    italic: !element.style?.italic,
                  },
                })
              }
              className={cn(
                "flex-1 h-7 rounded border border-border flex items-center justify-center transition-colors",
                element.style?.italic
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Color */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-muted-foreground">Цвет</label>
            <input
              type="color"
              className="h-6 w-10 rounded border border-border cursor-pointer bg-transparent"
              value={element.style?.color ?? "#000000"}
              onChange={(e) => onUpdate({ style: { ...element.style, color: e.target.value } })}
            />
            {element.style?.color && (
              <button
                type="button"
                className="text-[10px] text-muted-foreground hover:text-foreground"
                onClick={() => {
                  const { color: _, ...rest } = element.style ?? {};
                  onUpdate({ style: rest });
                }}
              >
                Сбросить
              </button>
            )}
          </div>

          {/* Opacity */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Прозрачность</label>
              <span className="text-[10px] text-muted-foreground">
                {Math.round((element.style?.opacity ?? 1) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="w-full h-1.5 accent-primary"
              value={element.style?.opacity ?? 1}
              onChange={(e) =>
                onUpdate({ style: { ...element.style, opacity: parseFloat(e.target.value) } })
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function SlideVisualEditor({ projectId, initialGraph }: SlideVisualEditorProps) {
  const router = useRouter();
  const [graph, setGraph] = useState<SlideGraph>(initialGraph);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const mainIframeRef = useRef<HTMLIFrameElement>(null);
  const pendingPatchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSlide = graph.slides[activeSlideIndex] ?? graph.slides[0]!;

  // Write main iframe whenever slide changes
  useEffect(() => {
    const doc = mainIframeRef.current?.contentDocument;
    if (!doc) return;
    const fullHtml = renderSlideGraph({ ...graph, slides: [activeSlide] });
    // Remove the deck wrapper padding for single-slide view
    const singleHtml = fullHtml.replace(
      "padding: 32px 0;",
      "padding: 0;"
    ).replace(
      ".lmnt-deck { display: flex; flex-direction: column; align-items: center; gap: 24px; }",
      ".lmnt-deck { display: flex; flex-direction: column; align-items: center; }"
    );
    doc.open();
    doc.write(singleHtml);
    doc.close();
  }, [activeSlide, graph]);

  // Listen for element selection from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "lmnt-elem-selected") {
        setSelection({
          slideId: e.data.slideId as string,
          elemId: e.data.elemId as string,
        });
      } else if (e.data?.type === "lmnt-elem-deselected") {
        setSelection(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const selectedElement = selection
    ? graph.slides
        .find((s) => s.id === selection.slideId)
        ?.elements.find((el) => el.id === selection.elemId) ?? null
    : null;

  // Apply patch locally + debounce save to server
  const handleElementUpdate = useCallback(
    (patch: Partial<SlideElement>) => {
      if (!selection) return;

      setGraph((prev) => ({
        ...prev,
        slides: prev.slides.map((slide) => {
          if (slide.id !== selection.slideId) return slide;
          return {
            ...slide,
            elements: slide.elements.map((el) =>
              el.id === selection.elemId ? { ...el, ...patch } : el
            ),
          };
        }),
      }));

      // Debounce server save
      if (pendingPatchRef.current) clearTimeout(pendingPatchRef.current);
      pendingPatchRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/projects/${projectId}/slides/patch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              patches: [{ slideId: selection.slideId, elemId: selection.elemId, ...patch }],
            }),
          });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [projectId, selection]
  );

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/slides/export`, { method: "POST" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${graph.meta.title}.pptx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [projectId, graph.meta.title]);

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-4 h-12 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push(`/playground/build?projectId=${projectId}`)}
        >
          <ArrowLeft className="w-4 h-4" />
          AI Chat
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <p className="text-sm font-medium truncate max-w-[300px]">{graph.meta.title}</p>
        <div className="flex-1" />
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Сохранение…
          </span>
        )}
        {/* Slide nav */}
        <div className="flex items-center gap-1 border border-border rounded-md px-1">
          <button
            type="button"
            onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))}
            disabled={activeSlideIndex === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium min-w-[52px] text-center">
            {activeSlideIndex + 1} / {graph.slides.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveSlideIndex((i) => Math.min(graph.slides.length - 1, i + 1))}
            disabled={activeSlideIndex === graph.slides.length - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => void handleExport()}
          disabled={exporting}
        >
          {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          PPTX
        </Button>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: slide thumbnails */}
        <div className="w-36 shrink-0 border-r border-border bg-muted/20 overflow-y-auto flex flex-col gap-2 p-2">
          {graph.slides.map((slide, i) => (
            <SlideThumbnail
              key={slide.id}
              slide={slide}
              theme={graph.meta.theme}
              index={i}
              active={i === activeSlideIndex}
              onClick={() => { setActiveSlideIndex(i); setSelection(null); }}
            />
          ))}
        </div>

        {/* Center: main preview iframe */}
        <div className="flex-1 overflow-hidden bg-[#1a1a2e] flex items-center justify-center p-6">
          <div className="w-full max-w-4xl" style={{ aspectRatio: "16/9" }}>
            <iframe
              ref={mainIframeRef}
              title="Slide preview"
              className="w-full h-full rounded-lg shadow-2xl border-0"
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        </div>

        {/* Right: properties panel */}
        <div
          className={cn(
            "w-56 shrink-0 border-l border-border bg-card overflow-hidden flex flex-col transition-all",
            selectedElement ? "opacity-100" : "opacity-50"
          )}
        >
          {selectedElement ? (
            <PropertiesPanel
              element={selectedElement}
              onUpdate={handleElementUpdate}
              onClose={() => setSelection(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 h-full p-4 text-center">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Кликните на элемент слайда для редактирования
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
  MessageSquare,
  FileText,
  Pencil,
  ChevronUp,
  ChevronDown,
  Send,
  X,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PLAYGROUND_HOME_PROJECTS_HREF } from "@/lib/playground-project-edit-url";
import type { SlideGraph, Slide, SlideElement } from "@/lib/slide-graph/types";
import { renderSlide, renderSlideGraph } from "@/lib/slide-graph/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type Selection = { slideId: string; elemId: string } | null;
type RightTab = "visual" | "chat" | "notes";
type ChatMessage = { role: "user" | "assistant"; content: string };

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
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  canDelete,
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
    <div className="group relative w-full shrink-0">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "relative w-full rounded-md overflow-hidden border-2 transition-all",
          active ? "border-primary shadow-md" : "border-transparent hover:border-muted-foreground/30"
        )}
        style={{ aspectRatio: "16/9" }}
      >
        <iframe
          ref={iframeRef}
          title={`Слайд ${index + 1}`}
          className="absolute inset-0 w-full h-full pointer-events-none"
          sandbox="allow-same-origin"
        />
        <div className="absolute inset-0" />
        <span className="absolute bottom-1 right-1.5 text-[9px] text-white/60 bg-black/30 px-1 rounded">
          {index + 1}
        </span>
      </button>

      {/* Controls — visible on hover or when active */}
      <div className={cn(
        "absolute right-0.5 top-0.5 flex flex-col gap-0.5 transition-opacity",
        active ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <button
          type="button"
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className="w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 disabled:opacity-30"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          type="button"
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className="w-5 h-5 rounded bg-black/50 text-white/80 flex items-center justify-center hover:bg-black/70 disabled:opacity-30"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="w-5 h-5 rounded bg-red-500/70 text-white flex items-center justify-center hover:bg-red-600/80"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
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
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs px-1">
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {isText && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Текст</label>
            <textarea
              className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              rows={4}
              value={element.content ?? ""}
              onChange={(e) => onUpdate({ content: e.target.value })}
            />
          </div>
        )}

        {isList && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Пункты</label>
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
                  onClick={() => onUpdate({ items: (element.items ?? []).filter((_, j) => j !== i) })}
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

        {element.type === "image" && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">URL изображения</label>
            <input
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={element.src ?? ""}
              onChange={(e) => onUpdate({ src: e.target.value })}
            />
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Alt-текст</label>
            <input
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              value={element.alt ?? ""}
              onChange={(e) => onUpdate({ alt: e.target.value })}
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Стиль</label>
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
          <div className="flex gap-1">
            {[
              { key: "bold", icon: Bold, check: () => element.style?.fontWeight === "bold", toggle: () => onUpdate({ style: { ...element.style, fontWeight: element.style?.fontWeight === "bold" ? "normal" : "bold" } }) },
              { key: "italic", icon: Italic, check: () => element.style?.italic, toggle: () => onUpdate({ style: { ...element.style, italic: !element.style?.italic } }) },
            ].map(({ key, icon: Icon, check, toggle }) => (
              <button
                key={key}
                type="button"
                onClick={toggle}
                className={cn(
                  "flex-1 h-7 rounded border border-border flex items-center justify-center transition-colors",
                  check() ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
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
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-muted-foreground">Прозрачность</label>
              <span className="text-[10px] text-muted-foreground">{Math.round((element.style?.opacity ?? 1) * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              className="w-full h-1.5 accent-primary"
              value={element.style?.opacity ?? 1}
              onChange={(e) => onUpdate({ style: { ...element.style, opacity: parseFloat(e.target.value) } })}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AI Chat panel ────────────────────────────────────────────────────────────

function ChatPanel({
  projectId,
  graph,
  onGraphUpdate,
}: {
  projectId: string;
  graph: SlideGraph;
  onGraphUpdate: (g: SlideGraph) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      const res = await fetch(`/api/projects/${projectId}/slides/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: messages.slice(-10),
        }),
      });
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка. Попробуйте ещё раз." }]);
        return;
      }
      const data = (await res.json()) as {
        data?: { message?: string; graph?: SlideGraph };
      };
      const msg = data.data?.message ?? "Готово.";
      setMessages((prev) => [...prev, { role: "assistant", content: msg }]);
      if (data.data?.graph) onGraphUpdate(data.data.graph);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка соединения." }]);
    } finally {
      setSending(false);
    }
  }, [input, sending, messages, projectId, onGraphUpdate]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-xs font-medium">AI-редактирование</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Опишите изменения — AI применит их</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center mt-4 px-2 leading-relaxed">
            Например: «Сделай заголовок первого слайда синим» или «Добавь пункт про дедлайны»
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "text-[11px] rounded-lg px-2.5 py-2 leading-relaxed max-w-full",
              m.role === "user"
                ? "bg-primary text-primary-foreground ml-4"
                : "bg-muted text-foreground mr-4"
            )}
          >
            {m.content}
          </div>
        ))}
        {sending && (
          <div className="bg-muted rounded-lg px-2.5 py-2 mr-4 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">Обрабатываю…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-border flex gap-1.5">
        <textarea
          className="flex-1 text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary min-h-[52px] max-h-[100px]"
          placeholder="Напишите инструкцию…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          disabled={sending}
        />
        <Button
          size="icon"
          className="h-8 w-8 shrink-0 self-end"
          onClick={() => void send()}
          disabled={!input.trim() || sending}
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ─── Notes panel ──────────────────────────────────────────────────────────────

function NotesPanel({
  slide,
  onSave,
  saving,
}: {
  slide: Slide;
  onSave: (notes: string) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(slide.notes ?? "");

  useEffect(() => {
    setValue(slide.notes ?? "");
  }, [slide.id, slide.notes]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <p className="text-xs font-medium">Заметки спикера</p>
        <p className="text-[10px] text-muted-foreground">Слайд {slide.id}</p>
      </div>
      <div className="flex-1 flex flex-col p-2 gap-2 min-h-0">
        <textarea
          className="flex-1 text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Добавьте заметки для этого слайда…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={() => onSave(value)}
          disabled={saving || value === (slide.notes ?? "")}
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
          Сохранить
        </Button>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function SlideVisualEditor({ projectId, initialGraph }: SlideVisualEditorProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [graph, setGraph] = useState<SlideGraph>(initialGraph);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rightTab, setRightTab] = useState<RightTab>("visual");
  const [addingSlide, setAddingSlide] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);
  const mainIframeRef = useRef<HTMLIFrameElement>(null);
  const pendingPatchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSlide = graph.slides[activeSlideIndex] ?? graph.slides[0]!;

  // Write main iframe whenever slide changes
  useEffect(() => {
    const doc = mainIframeRef.current?.contentDocument;
    if (!doc) return;
    const fullHtml = renderSlideGraph({ ...graph, slides: [activeSlide] });
    const singleHtml = fullHtml
      .replace("padding: 32px 0;", "padding: 0;")
      .replace(
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
        setSelection({ slideId: e.data.slideId as string, elemId: e.data.elemId as string });
        setRightTab("visual");
      } else if (e.data?.type === "lmnt-elem-deselected") {
        setSelection(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const selectedElement = selection
    ? graph.slides.find((s) => s.id === selection.slideId)?.elements.find((el) => el.id === selection.elemId) ?? null
    : null;

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

  const handleExport = useCallback(async (format: "pptx" | "pdf" = "pptx") => {
    setExporting(true);
    try {
      const endpoint = format === "pdf"
        ? `/api/projects/${projectId}/slides/export-pdf`
        : `/api/projects/${projectId}/slides/export`;
      const res = await fetch(endpoint, { method: "POST" });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${graph.meta.title}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [projectId, graph.meta.title]);

  const callManage = useCallback(
    async (body: Record<string, unknown>) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/slides/manage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { graph?: SlideGraph; data?: { graph?: SlideGraph } };
        const nextGraph = data.graph ?? data.data?.graph;
        if (nextGraph) setGraph(nextGraph);
        return nextGraph;
      } finally {
        setSaving(false);
      }
    },
    [projectId]
  );

  const handleDeleteSlide = useCallback(
    async (slideId: string) => {
      if (!window.confirm("Удалить этот слайд?")) return;
      const newGraph = await callManage({ op: "delete", slideId });
      if (newGraph) {
        setActiveSlideIndex((i) => Math.min(i, newGraph.slides.length - 1));
      }
    },
    [callManage]
  );

  const handleMoveSlide = useCallback(
    async (index: number, dir: "up" | "down") => {
      const slides = [...graph.slides];
      const target = dir === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= slides.length) return;
      [slides[index], slides[target]] = [slides[target]!, slides[index]!];
      await callManage({ op: "reorder", slideIds: slides.map((s) => s.id) });
      setActiveSlideIndex(target);
    },
    [graph.slides, callManage]
  );

  const handleAddSlide = useCallback(async () => {
    setAddingSlide(true);
    try {
      const newGraph = await callManage({ op: "add", afterSlideId: activeSlide.id });
      if (newGraph) {
        const newIdx = newGraph.slides.findIndex((s) => !graph.slides.some((old) => old.id === s.id));
        if (newIdx !== -1) setActiveSlideIndex(newIdx);
      }
    } finally {
      setAddingSlide(false);
    }
  }, [callManage, activeSlide.id, graph.slides]);

  const handleSaveNotes = useCallback(
    async (notes: string) => {
      setNotesSaving(true);
      try {
        const newGraph = await callManage({ op: "update-notes", slideId: activeSlide.id, notes });
        if (newGraph) setGraph(newGraph);
      } finally {
        setNotesSaving(false);
      }
    },
    [callManage, activeSlide.id]
  );

  const handleGraphUpdate = useCallback((g: SlideGraph) => {
    setGraph(g);
  }, []);

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
          <ArrowLeft className="w-4 h-4" />
          {t("nav_projects")}
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <p className="text-sm font-medium truncate max-w-[300px]">{graph.meta.title}</p>
        <div className="flex-1" />
        {saving && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Сохранение…
          </span>
        )}
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
            {addingSlide ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
            Слайд
          </button>
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

        {/* Right: tabbed panel */}
        <div className="w-64 shrink-0 border-l border-border bg-card flex flex-col">
          {/* Tab bar */}
          <div className="flex border-b border-border shrink-0">
            {([
              { key: "visual" as RightTab, icon: Pencil, label: "Свойства" },
              { key: "chat" as RightTab, icon: MessageSquare, label: "AI" },
              { key: "notes" as RightTab, icon: FileText, label: "Заметки" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setRightTab(key)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors border-b-2",
                  rightTab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {rightTab === "visual" && (
              selectedElement ? (
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
              )
            )}
            {rightTab === "chat" && (
              <ChatPanel
                projectId={projectId}
                graph={graph}
                onGraphUpdate={handleGraphUpdate}
              />
            )}
            {rightTab === "notes" && (
              <NotesPanel
                slide={activeSlide}
                onSave={handleSaveNotes}
                saving={notesSaving}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

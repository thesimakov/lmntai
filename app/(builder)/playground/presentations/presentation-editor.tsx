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
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SlideGraph, Slide, SlideElement } from "@/lib/slide-graph/types";
import { renderSlide, renderSingleSlide } from "@/lib/slide-graph/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

type Selection = { slideId: string; elemId: string } | null;
type RightTab = "visual" | "chat" | "notes";
type ChatMessage = { role: "user" | "assistant"; content: string };

interface Props {
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
    const slideHtml = renderSlide(slide, theme);
    const bg = slide.background?.color ?? theme.backgroundColor;
    const html = `<!DOCTYPE html><html><head><style>
      *{box-sizing:border-box;margin:0;padding:0}
      html,body{width:960px;height:540px;overflow:hidden;font-family:${theme.fontFamily};color:${theme.textColor};background:${bg}}
      .lmnt-slide{width:960px;height:540px;position:relative;overflow:hidden}
    </style></head><body>${slideHtml}</body></html>`;
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
          style={{ transform: "scale(0.125)", transformOrigin: "top left", width: "800%", height: "800%" }}
          sandbox="allow-same-origin"
        />
        <span className="absolute bottom-1 right-1.5 text-[9px] text-white/60 bg-black/30 px-1 rounded">
          {index + 1}
        </span>
      </button>

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Textarea({ value, onChange, rows = 3, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  return (
    <textarea
      className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function PropertiesPanel({
  element,
  onUpdate,
  onClose,
}: {
  element: SlideElement;
  onUpdate: (patch: Partial<SlideElement>) => void;
  onClose: () => void;
}) {
  const str = (v: string | undefined) => v ?? "";
  const items = element.items ?? [];
  const features = element.features ?? [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <p className="text-xs font-medium capitalize">{element.type.replace(/-/g, " ")}</p>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs px-1">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">

        {/* Basic text elements */}
        {(["heading", "subheading", "body", "quote", "caption", "label"] as const).includes(element.type as never) && (
          <Field label="Текст">
            <Textarea value={str(element.content)} onChange={(v) => onUpdate({ content: v })} rows={4} />
          </Field>
        )}

        {element.type === "bullet-list" && (
          <Field label="Пункты">
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                    value={item}
                    onChange={(e) => {
                      const next = [...items];
                      next[i] = e.target.value;
                      onUpdate({ items: next });
                    }}
                  />
                  <button type="button" onClick={() => onUpdate({ items: items.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-6 text-xs gap-1 w-full" onClick={() => onUpdate({ items: [...items, ""] })}>
                <Plus className="w-3 h-3" /> Добавить
              </Button>
            </div>
          </Field>
        )}

        {element.type === "image" && (
          <>
            <Field label="URL">
              <Input value={str(element.src)} onChange={(v) => onUpdate({ src: v })} placeholder="https://..." />
            </Field>
            <Field label="Alt-текст">
              <Input value={str(element.alt)} onChange={(v) => onUpdate({ alt: v })} />
            </Field>
          </>
        )}

        {/* metric-card */}
        {element.type === "metric-card" && (
          <>
            <Field label="Заголовок"><Input value={str(element.label)} onChange={(v) => onUpdate({ label: v })} /></Field>
            <Field label="Описание"><Textarea value={str(element.description)} onChange={(v) => onUpdate({ description: v })} rows={2} /></Field>
          </>
        )}

        {/* stat-number */}
        {element.type === "stat-number" && (
          <>
            <Field label="Число"><Input value={str(element.value)} onChange={(v) => onUpdate({ value: v })} placeholder="68%" /></Field>
            <Field label="Изменение"><Input value={str(element.change)} onChange={(v) => onUpdate({ change: v })} placeholder="+25%" /></Field>
            <Field label="Метка"><Input value={str(element.label)} onChange={(v) => onUpdate({ label: v })} /></Field>
          </>
        )}

        {/* feature-card */}
        {element.type === "feature-card" && (
          <>
            <Field label="Бейдж"><Input value={str(element.badge)} onChange={(v) => onUpdate({ badge: v })} placeholder="CORE" /></Field>
            <Field label="Название"><Input value={str(element.content)} onChange={(v) => onUpdate({ content: v })} /></Field>
            <Field label="Описание"><Textarea value={str(element.description)} onChange={(v) => onUpdate({ description: v })} rows={2} /></Field>
          </>
        )}

        {/* step-card */}
        {element.type === "step-card" && (
          <>
            <Field label="Шаг №">
              <input
                type="number"
                min={1}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={element.stepNumber ?? 1}
                onChange={(e) => onUpdate({ stepNumber: parseInt(e.target.value, 10) })}
              />
            </Field>
            <Field label="Название"><Input value={str(element.content)} onChange={(v) => onUpdate({ content: v })} /></Field>
            <Field label="Описание"><Textarea value={str(element.description)} onChange={(v) => onUpdate({ description: v })} rows={2} /></Field>
          </>
        )}

        {/* pricing-card */}
        {element.type === "pricing-card" && (
          <>
            <Field label="Тариф"><Input value={str(element.planName)} onChange={(v) => onUpdate({ planName: v })} /></Field>
            <Field label="Цена"><Input value={str(element.price)} onChange={(v) => onUpdate({ price: v })} /></Field>
            <Field label="Период"><Input value={str(element.period)} onChange={(v) => onUpdate({ period: v })} placeholder="руб/мес" /></Field>
            <Field label="Фичи">
              <div className="space-y-1.5">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={f}
                      onChange={(e) => {
                        const next = [...features];
                        next[i] = e.target.value;
                        onUpdate({ features: next });
                      }}
                    />
                    <button type="button" onClick={() => onUpdate({ features: features.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 w-full" onClick={() => onUpdate({ features: [...features, ""] })}>
                  <Plus className="w-3 h-3" /> Добавить
                </Button>
              </div>
            </Field>
            <Field label="Популярный">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={element.popular ?? false} onChange={(e) => onUpdate({ popular: e.target.checked })} />
                Выделить как популярный
              </label>
            </Field>
          </>
        )}

        {/* timeline-col */}
        {element.type === "timeline-col" && (
          <>
            <Field label="Период"><Input value={str(element.period)} onChange={(v) => onUpdate({ period: v })} placeholder="Q2 2026" /></Field>
            <Field label="Фаза"><Input value={str(element.content)} onChange={(v) => onUpdate({ content: v })} /></Field>
            <Field label="Майлстоны">
              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      className="flex-1 text-xs border border-border rounded-md px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                      value={item}
                      onChange={(e) => {
                        const next = [...items];
                        next[i] = e.target.value;
                        onUpdate({ items: next });
                      }}
                    />
                    <button type="button" onClick={() => onUpdate({ items: items.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1 w-full" onClick={() => onUpdate({ items: [...items, ""] })}>
                  <Plus className="w-3 h-3" /> Добавить
                </Button>
              </div>
            </Field>
            <Field label="Текущий квартал">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={element.highlighted ?? false} onChange={(e) => onUpdate({ highlighted: e.target.checked })} />
                Выделить колонку
              </label>
            </Field>
          </>
        )}

        {/* Style controls for text elements */}
        {(["heading", "subheading", "body", "quote", "caption", "label", "bullet-list"] as const).includes(element.type as never) && (
          <div className="space-y-2 pt-1 border-t border-border">
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
              {([
                { key: "bold", Icon: Bold, active: () => element.style?.fontWeight === "bold", toggle: () => onUpdate({ style: { ...element.style, fontWeight: element.style?.fontWeight === "bold" ? "normal" : "bold" } }) },
                { key: "italic", Icon: Italic, active: () => element.style?.italic, toggle: () => onUpdate({ style: { ...element.style, italic: !element.style?.italic } }) },
              ] as const).map(({ key, Icon, active, toggle }) => (
                <button
                  key={key}
                  type="button"
                  onClick={toggle}
                  className={cn(
                    "flex-1 h-7 rounded border border-border flex items-center justify-center transition-colors",
                    active() ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
          </div>
        )}
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
        body: JSON.stringify({ message: text, history: messages.slice(-10) }),
      });
      if (!res.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: "Ошибка. Попробуйте ещё раз." }]);
        return;
      }
      const data = (await res.json()) as { data?: { message?: string; graph?: SlideGraph } };
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
      <div className="px-3 py-2 border-b border-border shrink-0">
        <p className="text-xs font-medium">AI-редактирование</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Опишите изменения — AI применит их</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="text-[11px] text-muted-foreground text-center mt-4 px-2 leading-relaxed">
            Например: «Сделай заголовок первого слайда синим» или «Добавь метрику про ARR»
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "text-[11px] rounded-lg px-2.5 py-2 leading-relaxed",
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

function NotesPanel({ slide, onSave, saving }: { slide: Slide; onSave: (notes: string) => void; saving: boolean }) {
  const [value, setValue] = useState(slide.notes ?? "");

  useEffect(() => { setValue(slide.notes ?? ""); }, [slide.id, slide.notes]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border shrink-0">
        <p className="text-xs font-medium">Заметки спикера</p>
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

export function PresentationEditorClient({ projectId, initialGraph }: Props) {
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
    const html = renderSingleSlide(graph, activeSlideIndex);
    doc.open();
    doc.write(html);
    doc.close();
  }, [activeSlide, graph, activeSlideIndex]);

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
        const data = (await res.json()) as { data?: { graph?: SlideGraph } };
        if (data.data?.graph) setGraph(data.data.graph);
        return data.data?.graph;
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
      if (newGraph) setActiveSlideIndex((i) => Math.min(i, newGraph.slides.length - 1));
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

  const handleChangeTemplate = useCallback(async () => {
    if (!window.confirm("Создать новую презентацию? Текущая будет удалена.")) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/slides/patch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearAll: true }),
      });
    } finally {
      setSaving(false);
    }
    router.refresh();
  }, [projectId, router]);

  return (
    <div className="flex flex-col w-full h-full bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-2 px-4 h-12 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push("/presentations")}
        >
          <ArrowLeft className="w-4 h-4" />
          Презентации
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        <p className="text-sm font-medium truncate max-w-[260px]">{graph.meta.title}</p>
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
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
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
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 h-8"
          onClick={() => void handleChangeTemplate()}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Шаблон
        </Button>
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
        {/* Left: thumbnails */}
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

        {/* Center: main preview */}
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
                onGraphUpdate={(g) => setGraph(g)}
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

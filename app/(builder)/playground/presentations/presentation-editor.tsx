"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Download, Loader2, ChevronLeft, ChevronRight,
  Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  Trash2, Plus, MessageSquare, FileText, Pencil,
  ChevronUp, ChevronDown, X, RefreshCw,
  Image as ImageIcon, Type, List, Palette, Layers,
} from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "@/components/editor/ImageUploader";
import { cn } from "@/lib/utils";
import { AgentChat, type ChatMessage as AgentChatMessage } from "@/components/playground/agent-chat";
import {
  resolveAgentForTask,
  type AgentPickerLabel,
} from "@/lib/agent-models";
import { PLAYGROUND_HOME_PROJECTS_HREF } from "@/lib/playground-project-edit-url";
import type { SlideGraph, Slide, SlideElement, SlideBackground } from "@/lib/slide-graph/types";
import { applyFramesToSlide, clampFrame, defaultElementFrame } from "@/lib/slide-graph/freeform";
import { mergeSlideBackground } from "@/lib/slide-graph/patch";
import { renderSlide, renderSingleSlide } from "@/lib/slide-graph/renderer";
import type { SlideElementFrame } from "@/lib/slide-graph/types";

type Selection = { slideId: string; elemId: string } | null;
type RightTab = "visual" | "chat" | "notes";

interface Props {
  projectId: string;
  initialGraph: SlideGraph;
  userPlan: string | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return `el_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Thumbnail ────────────────────────────────────────────────────────────────

function SlideThumbnail({
  slide, theme, index, active, onClick, onDelete, onMoveUp, onMoveDown, canMoveUp, canMoveDown, canDelete,
}: {
  slide: Slide; theme: SlideGraph["meta"]["theme"]; index: number; active: boolean;
  onClick: () => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void;
  canMoveUp: boolean; canMoveDown: boolean; canDelete: boolean;
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

// ─── Field helpers (right panel — readable labels & controls) ─────────────────

const panelFieldLabel =
  "text-xs font-semibold text-foreground/90 uppercase tracking-wide";
const panelSectionTitle =
  "text-xs font-semibold text-foreground/85 uppercase tracking-wide";
const panelInput =
  "w-full text-sm text-foreground border border-border rounded-md px-2.5 py-2 bg-background shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/35 placeholder:text-muted-foreground/70";
const panelIconBtn =
  "flex items-center justify-center rounded-md border border-border text-foreground/80 hover:bg-muted hover:text-foreground disabled:opacity-35 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className={panelFieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function Inp({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className={panelInput}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

function Txa({ value, onChange, rows = 3 }: { value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <textarea
      className={cn(panelInput, "resize-none leading-relaxed")}
      rows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

type PartStyleColorKey = "labelColor" | "descriptionColor" | "valueColor" | "changeColor";

const PART_COLOR_SWATCHES = ["#ffffff", "#000000", "#c41e3a", "#2563eb", "#16a34a", "#f59e0b"] as const;

function PartColorPicker({
  value,
  pickerFallback,
  onChange,
  onClear,
}: {
  value: string | undefined;
  pickerFallback: string;
  onChange: (color: string) => void;
  onClear: () => void;
}) {
  const pickerValue = value?.startsWith("#") && value.length >= 4 ? value : pickerFallback;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <input
          type="color"
          className="h-8 w-9 rounded-md border border-border cursor-pointer bg-transparent shrink-0"
          value={pickerValue}
          onChange={(e) => onChange(e.target.value)}
          title="Цвет"
        />
        <input
          type="text"
          className={cn(panelInput, "flex-1 font-mono text-xs py-1.5")}
          value={value ?? ""}
          placeholder="авто"
          onChange={(e) => onChange(e.target.value)}
        />
        {value && (
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 px-1"
            onClick={onClear}
          >
            ✕
          </button>
        )}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {PART_COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className="w-full aspect-square rounded border border-border hover:scale-110 transition-transform"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

function FieldWithPartColor({
  label,
  colorKey,
  element,
  onUpdate,
  pickerFallback = "#000000",
  children,
}: {
  label: string;
  colorKey: PartStyleColorKey;
  element: SlideElement;
  onUpdate: (patch: Partial<SlideElement>) => void;
  pickerFallback?: string;
  children: React.ReactNode;
}) {
  const partColor = element.style?.[colorKey];
  const setPartColor = (color: string) =>
    onUpdate({ style: { ...element.style, [colorKey]: color } });
  const clearPartColor = () => {
    if (!element.style) return;
    const next = { ...element.style };
    delete next[colorKey];
    onUpdate({ style: Object.keys(next).length ? next : undefined });
  };

  return (
    <div className="space-y-1.5">
      <label className={panelFieldLabel}>{label}</label>
      {children}
      <PartColorPicker
        value={partColor}
        pickerFallback={pickerFallback}
        onChange={setPartColor}
        onClear={clearPartColor}
      />
    </div>
  );
}

// ─── Slide properties (no element selected) ───────────────────────────────────

function SlidePanel({
  slide, theme, onBgChange, onAddElement,
}: {
  slide: Slide;
  theme: SlideGraph["meta"]["theme"];
  onBgChange: (bg: Partial<SlideBackground>) => void;
  onAddElement: (type: SlideElement["type"]) => void;
}) {
  const bgColor = slide.background?.color ?? theme.backgroundColor;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-3 py-2.5 border-b border-border shrink-0">
        <p className="text-sm font-semibold text-foreground">Слайд</p>
        <p className="text-xs text-muted-foreground mt-0.5">{slide.layout}</p>
      </div>

      <div className="p-3 space-y-4">
        {/* Background */}
        <div className="space-y-2">
          <p className={cn(panelSectionTitle, "flex items-center gap-1.5")}>
            <Palette className="w-3.5 h-3.5" /> Фон
          </p>
          <div className="flex items-center gap-2">
            <input
              type="color"
              className="h-9 w-11 rounded-md border border-border cursor-pointer bg-transparent"
              value={bgColor.startsWith("#") ? bgColor : "#ffffff"}
              onChange={(e) => onBgChange({ color: e.target.value })}
            />
            <input
              type="text"
              className={cn(panelInput, "flex-1 font-mono")}
              value={bgColor}
              onChange={(e) => onBgChange({ color: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {["#ffffff", "#0f0f1a", "#1a1a2e", "#c41e3a", "#2563eb", "#f0f6ff"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onBgChange({ color: c })}
                className="w-full aspect-square rounded border border-border hover:scale-110 transition-transform"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Add elements */}
        <div className="space-y-2">
          <p className={cn(panelSectionTitle, "flex items-center gap-1.5")}>
            <Layers className="w-3.5 h-3.5" /> Добавить элемент
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { type: "heading", label: "Заголовок", icon: Type },
              { type: "body", label: "Текст", icon: Type },
              { type: "bullet-list", label: "Список", icon: List },
              { type: "image", label: "Изображение", icon: ImageIcon },
            ] as const).map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => onAddElement(type)}
                className="flex items-center gap-2 px-2.5 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors text-left text-foreground"
              >
                <Icon className="w-4 h-4 text-foreground/70 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Elements list */}
        <div className="space-y-1">
          <p className={panelSectionTitle}>Элементы слайда</p>
          {slide.elements.map((el, i) => (
            <div key={el.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 text-sm text-foreground">
              <span className="flex-1 truncate">
                <span className="text-muted-foreground mr-1 font-medium">{i + 1}.</span>
                {el.type}
                {el.content ? ` — ${el.content.slice(0, 20)}` : el.label ? ` — ${el.label.slice(0, 20)}` : ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Element properties panel ─────────────────────────────────────────────────

function PropertiesPanel({
  projectId,
  element,
  onUpdate,
  onClose,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  projectId: string;
  element: SlideElement;
  onUpdate: (patch: Partial<SlideElement>) => void;
  onClose: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const { t } = useI18n();
  const s = (v: string | undefined) => v ?? "";
  const items = element.items ?? [];
  const features = element.features ?? [];
  const isText = ["heading", "subheading", "body", "quote", "caption", "label"].includes(element.type);
  const isTextOrList = isText || element.type === "bullet-list";
  const hasPartColors = element.type === "metric-card" || element.type === "stat-number";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border shrink-0 gap-1">
        <p className="text-sm font-semibold text-foreground capitalize truncate">
          {element.type.replace(/-/g, " ")}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" disabled={!canMoveUp} onClick={onMoveUp} className={cn(panelIconBtn, "w-7 h-7")}>
            <ChevronUp className="w-4 h-4" />
          </button>
          <button type="button" disabled={!canMoveDown} onClick={onMoveDown} className={cn(panelIconBtn, "w-7 h-7")}>
            <ChevronDown className="w-4 h-4" />
          </button>
          <button type="button" onClick={onDelete} className={cn(panelIconBtn, "w-7 h-7 hover:bg-red-500/10 hover:text-red-600 hover:border-red-200")}>
            <Trash2 className="w-4 h-4" />
          </button>
          <button type="button" onClick={onClose} className={cn(panelIconBtn, "w-7 h-7 ml-0.5")}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0">

        {/* ── Text elements ── */}
        {isText && (
          <Field label="Текст">
            <Txa value={s(element.content)} onChange={(v) => onUpdate({ content: v })} rows={4} />
          </Field>
        )}

        {element.type === "bullet-list" && (
          <Field label="Пункты">
            <div className="space-y-1.5">
              {items.map((item, i) => (
                <div key={i} className="flex gap-1.5">
                  <input
                    className={cn(panelInput, "flex-1")}
                    value={item}
                    onChange={(e) => { const n = [...items]; n[i] = e.target.value; onUpdate({ items: n }); }}
                  />
                  <button type="button" onClick={() => onUpdate({ items: items.filter((_, j) => j !== i) })} className="text-foreground/60 hover:text-red-600 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button size="sm" variant="outline" className="h-8 text-sm gap-1.5 w-full" onClick={() => onUpdate({ items: [...items, ""] })}>
                <Plus className="w-4 h-4" /> Добавить пункт
              </Button>
            </div>
          </Field>
        )}

        {/* ── Image ── */}
        {element.type === "image" && (
          <>
            <Field label={t("presentations_image_upload_label")}>
              <ImageUploader
                sandboxId={projectId}
                labels={{
                  upload: t("build_visual_upload_image"),
                  uploading: t("build_visual_uploading"),
                  errorType: t("build_visual_image_type_error"),
                }}
                onUploaded={(url) => onUpdate({ src: url })}
              />
            </Field>
            {element.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={element.src}
                alt=""
                className="w-full rounded-md border border-border object-cover max-h-32"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            )}
            <Field label={t("presentations_image_url_label")}>
              <Inp
                value={s(element.src)}
                onChange={(v) => onUpdate({ src: v })}
                placeholder="https://..."
              />
            </Field>
            <Field label={t("presentations_image_alt_label")}>
              <Inp value={s(element.alt)} onChange={(v) => onUpdate({ alt: v })} />
            </Field>
          </>
        )}

        {/* ── metric-card ── */}
        {element.type === "metric-card" && (
          <>
            <FieldWithPartColor label="Заголовок" colorKey="labelColor" element={element} onUpdate={onUpdate} pickerFallback="#1a1a2e">
              <Inp value={s(element.label)} onChange={(v) => onUpdate({ label: v })} />
            </FieldWithPartColor>
            <FieldWithPartColor label="Описание" colorKey="descriptionColor" element={element} onUpdate={onUpdate} pickerFallback="#666666">
              <Txa value={s(element.description)} onChange={(v) => onUpdate({ description: v })} rows={2} />
            </FieldWithPartColor>
          </>
        )}

        {/* ── stat-number ── */}
        {element.type === "stat-number" && (
          <>
            <FieldWithPartColor label="Число" colorKey="valueColor" element={element} onUpdate={onUpdate} pickerFallback="#c41e3a">
              <Inp value={s(element.value)} onChange={(v) => onUpdate({ value: v })} placeholder="68%" />
            </FieldWithPartColor>
            <FieldWithPartColor label="Изменение" colorKey="changeColor" element={element} onUpdate={onUpdate} pickerFallback="#22c55e">
              <Inp value={s(element.change)} onChange={(v) => onUpdate({ change: v })} placeholder="+25%" />
            </FieldWithPartColor>
            <FieldWithPartColor label="Метка" colorKey="labelColor" element={element} onUpdate={onUpdate} pickerFallback="#888888">
              <Inp value={s(element.label)} onChange={(v) => onUpdate({ label: v })} />
            </FieldWithPartColor>
          </>
        )}

        {/* ── feature-card ── */}
        {element.type === "feature-card" && (
          <>
            <Field label="Бейдж"><Inp value={s(element.badge)} onChange={(v) => onUpdate({ badge: v })} placeholder="CORE" /></Field>
            <Field label="Название"><Inp value={s(element.content)} onChange={(v) => onUpdate({ content: v })} /></Field>
            <Field label="Описание"><Txa value={s(element.description)} onChange={(v) => onUpdate({ description: v })} rows={2} /></Field>
          </>
        )}

        {/* ── step-card ── */}
        {element.type === "step-card" && (
          <>
            <Field label="Шаг №">
              <input type="number" min={1} className={panelInput}
                value={element.stepNumber ?? 1} onChange={(e) => onUpdate({ stepNumber: parseInt(e.target.value, 10) })} />
            </Field>
            <Field label="Название"><Inp value={s(element.content)} onChange={(v) => onUpdate({ content: v })} /></Field>
            <Field label="Описание"><Txa value={s(element.description)} onChange={(v) => onUpdate({ description: v })} rows={2} /></Field>
          </>
        )}

        {/* ── pricing-card ── */}
        {element.type === "pricing-card" && (
          <>
            <Field label="Тариф"><Inp value={s(element.planName)} onChange={(v) => onUpdate({ planName: v })} /></Field>
            <Field label="Цена"><Inp value={s(element.price)} onChange={(v) => onUpdate({ price: v })} /></Field>
            <Field label="Период"><Inp value={s(element.period)} onChange={(v) => onUpdate({ period: v })} placeholder="руб/мес" /></Field>
            <Field label="Фичи">
              <div className="space-y-1.5">
                {features.map((f, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input className={cn(panelInput, "flex-1")}
                      value={f} onChange={(e) => { const n = [...features]; n[i] = e.target.value; onUpdate({ features: n }); }} />
                    <button type="button" onClick={() => onUpdate({ features: features.filter((_, j) => j !== i) })} className="text-foreground/60 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-8 text-sm gap-1.5 w-full" onClick={() => onUpdate({ features: [...features, ""] })}>
                  <Plus className="w-4 h-4" /> Добавить
                </Button>
              </div>
            </Field>
            <Field label="Популярный">
              <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={element.popular ?? false} onChange={(e) => onUpdate({ popular: e.target.checked })} />
                Выделить как популярный
              </label>
            </Field>
          </>
        )}

        {/* ── timeline-col ── */}
        {element.type === "timeline-col" && (
          <>
            <Field label="Период"><Inp value={s(element.period)} onChange={(v) => onUpdate({ period: v })} placeholder="Q2 2026" /></Field>
            <Field label="Фаза"><Inp value={s(element.content)} onChange={(v) => onUpdate({ content: v })} /></Field>
            <Field label="Майлстоны">
              <div className="space-y-1.5">
                {items.map((item, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input className={cn(panelInput, "flex-1")}
                      value={item} onChange={(e) => { const n = [...items]; n[i] = e.target.value; onUpdate({ items: n }); }} />
                    <button type="button" onClick={() => onUpdate({ items: items.filter((_, j) => j !== i) })} className="text-foreground/60 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <Button size="sm" variant="outline" className="h-8 text-sm gap-1.5 w-full" onClick={() => onUpdate({ items: [...items, ""] })}>
                  <Plus className="w-4 h-4" /> Добавить
                </Button>
              </div>
            </Field>
            <Field label="Текущий квартал">
              <label className="flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={element.highlighted ?? false} onChange={(e) => onUpdate({ highlighted: e.target.checked })} />
                Выделить колонку
              </label>
            </Field>
          </>
        )}

        {/* ── Text style controls ── */}
        {isTextOrList && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className={panelSectionTitle}>Стиль текста</p>
            <div className="flex gap-1.5">
              {(["left", "center", "right"] as const).map((align) => {
                const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                return (
                  <button key={align} type="button"
                    onClick={() => onUpdate({ style: { ...element.style, textAlign: align } })}
                    className={cn("flex-1 h-8 rounded-md border border-border flex items-center justify-center transition-colors",
                      element.style?.textAlign === align ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted text-foreground/80")}>
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1.5">
              <button type="button"
                onClick={() => onUpdate({ style: { ...element.style, fontWeight: element.style?.fontWeight === "bold" ? "normal" : "bold" } })}
                className={cn("flex-1 h-8 rounded-md border border-border flex items-center justify-center transition-colors",
                  element.style?.fontWeight === "bold" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted text-foreground/80")}>
                <Bold className="w-4 h-4" />
              </button>
              <button type="button"
                onClick={() => onUpdate({ style: { ...element.style, italic: !element.style?.italic } })}
                className={cn("flex-1 h-8 rounded-md border border-border flex items-center justify-center transition-colors",
                  element.style?.italic ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted text-foreground/80")}>
                <Italic className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {!hasPartColors && (
        <div className="space-y-2 pt-2 border-t border-border">
          <p className={panelSectionTitle}>Цвет текста</p>
          <div className="flex items-center gap-2">
            <input type="color"
              className="h-9 w-11 rounded-md border border-border cursor-pointer bg-transparent"
              value={element.style?.color ?? "#000000"}
              onChange={(e) => onUpdate({ style: { ...element.style, color: e.target.value } })}
            />
            <input type="text"
              className={cn(panelInput, "flex-1 font-mono")}
              value={element.style?.color ?? ""}
              placeholder="авто"
              onChange={(e) => onUpdate({ style: { ...element.style, color: e.target.value } })}
            />
            {element.style?.color && (
              <button type="button" className="text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 px-1"
                onClick={() => {
                  const next = { ...element.style };
                  delete next.color;
                  onUpdate({ style: Object.keys(next).length ? next : undefined });
                }}>
                ✕
              </button>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {["#ffffff", "#000000", "#c41e3a", "#2563eb", "#16a34a", "#f59e0b"].map((c) => (
              <button key={c} type="button"
                onClick={() => onUpdate({ style: { ...element.style, color: c } })}
                className="w-full aspect-square rounded border border-border hover:scale-110 transition-transform"
                style={{ background: c }} title={c} />
            ))}
          </div>
        </div>
        )}

        {/* ── Opacity ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className={panelSectionTitle}>Прозрачность</p>
            <span className="text-sm font-semibold text-foreground tabular-nums">{Math.round((element.style?.opacity ?? 1) * 100)}%</span>
          </div>
          <input type="range" min={0} max={1} step={0.05} className="w-full h-2 accent-primary"
            value={element.style?.opacity ?? 1}
            onChange={(e) => onUpdate({ style: { ...element.style, opacity: parseFloat(e.target.value) } })} />
        </div>
      </div>
    </div>
  );
}

// ─── AI Chat panel ────────────────────────────────────────────────────────────

function createChatId() {
  return `msg_${Math.random().toString(36).slice(2, 10)}`;
}

function PresentationAgentChat({
  projectId,
  userPlan,
  onGraphUpdate,
}: {
  projectId: string;
  userPlan: string | null;
  onGraphUpdate: (g: SlideGraph) => void;
}) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [agentHint, setAgentHint] = useState<AgentPickerLabel>(() =>
    resolveAgentForTask({
      plan: userPlan,
      projectKind: "presentation",
      task: "generate-stream",
    }).uiLabel
  );

  const historyForApi = useCallback(
    () =>
      messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    [messages]
  );

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setMessages((prev) => [
        ...prev,
        { id: createChatId(), role: "user", content: trimmed, sentAt: Date.now() },
      ]);
      try {
        const res = await fetch(`/api/projects/${projectId}/slides/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            history: historyForApi(),
            agentHint,
          }),
        });
        const payload = (await res.json()) as {
          message?: string;
          graph?: SlideGraph;
          error?: string;
          data?: { message?: string; graph?: SlideGraph };
        };
        if (!res.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: createChatId(),
              role: "assistant",
              content: payload.error ?? t("presentations_ai_error"),
              sentAt: Date.now(),
            },
          ]);
          return;
        }
        const msg = payload.message ?? payload.data?.message ?? t("presentations_ai_done");
        setMessages((prev) => [
          ...prev,
          { id: createChatId(), role: "assistant", content: msg, sentAt: Date.now() },
        ]);
        const nextGraph = payload.graph ?? payload.data?.graph;
        if (nextGraph) onGraphUpdate(nextGraph);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: createChatId(),
            role: "assistant",
            content: t("presentations_ai_connection_error"),
            sentAt: Date.now(),
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending, projectId, agentHint, historyForApi, onGraphUpdate, t]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      <AgentChat
        title={t("presentations_ai_title")}
        subtitle={t("presentations_ai_subtitle")}
        placeholder={t("presentations_ai_placeholder")}
        messages={messages}
        disabled={sending}
        onSend={handleSend}
        plan={userPlan}
        projectKind="presentation"
        agentTask="generate-stream"
        onModelHintChange={setAgentHint}
        threadScrollKey={messages.length}
      />
    </div>
  );
}

// ─── Notes panel ──────────────────────────────────────────────────────────────

function NotesPanel({ slide, onSave, saving }: { slide: Slide; onSave: (notes: string) => void; saving: boolean }) {
  const [value, setValue] = useState(slide.notes ?? "");
  useEffect(() => { setValue(slide.notes ?? ""); }, [slide.id, slide.notes]);
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2.5 border-b border-border shrink-0"><p className="text-sm font-semibold text-foreground">Заметки спикера</p></div>
      <div className="flex-1 flex flex-col p-2.5 gap-2 min-h-0">
        <textarea className={cn(panelInput, "flex-1 resize-none leading-relaxed")}
          placeholder="Добавьте заметки для этого слайда…" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button size="sm" className="h-9 text-sm font-medium" onClick={() => onSave(value)} disabled={saving || value === (slide.notes ?? "")}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}Сохранить
        </Button>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export function PresentationEditorClient({ projectId, initialGraph, userPlan }: Props) {
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
    const html = renderSingleSlide(graph, activeSlideIndex, { editor: true });
    doc.open(); doc.write(html); doc.close();
  }, [activeSlide, graph, activeSlideIndex]);

  const selectedElement = selection
    ? graph.slides.find((s) => s.id === selection.slideId)?.elements.find((el) => el.id === selection.elemId) ?? null
    : null;

  // Debounced save to API
  const scheduleSave = useCallback((body: Record<string, unknown>) => {
    if (pendingPatchRef.current) clearTimeout(pendingPatchRef.current);
    pendingPatchRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/projects/${projectId}/slides/patch`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } finally { setSaving(false); }
    }, 800);
  }, [projectId]);

  // Listen for element selection / drag from iframe
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      const data = e.data as Record<string, unknown> | null;
      if (!data?.type) return;

      if (data.type === "lmnt-elem-selected") {
        setSelection({ slideId: data.slideId as string, elemId: data.elemId as string });
        setRightTab("visual");
        return;
      }
      if (data.type === "lmnt-elem-deselected") {
        setSelection(null);
        return;
      }
      if (data.type === "lmnt-elem-frame") {
        const slideId = data.slideId as string;
        const elemId = data.elemId as string;
        const frame = clampFrame(data.frame as SlideElementFrame);
        setGraph((prev) => ({
          ...prev,
          slides: prev.slides.map((slide) =>
            slide.id !== slideId
              ? slide
              : {
                  ...slide,
                  freeform: true,
                  elements: slide.elements.map((el) =>
                    el.id === elemId ? { ...el, frame } : el
                  ),
                }
          ),
        }));
        scheduleSave({ patches: [{ slideId, elemId, frame }] });
        return;
      }
      if (data.type === "lmnt-frames-init") {
        const slideId = data.slideId as string;
        const frames = (data.frames as Array<{ elemId: string; frame: SlideElementFrame }>) ?? [];
        setGraph((prev) => ({
          ...prev,
          slides: prev.slides.map((slide) =>
            slide.id !== slideId ? slide : applyFramesToSlide(slide, frames, { freeform: true })
          ),
        }));
        scheduleSave({ initElementFrames: { slideId, frames } });
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [scheduleSave]);

  // Update element content
  const handleElementUpdate = useCallback((patch: Partial<SlideElement>) => {
    if (!selection) return;
    setGraph((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.id !== selection.slideId ? slide : {
          ...slide,
          elements: slide.elements.map((el) => el.id === selection.elemId ? { ...el, ...patch } : el),
        }
      ),
    }));
    scheduleSave({ patches: [{ slideId: selection.slideId, elemId: selection.elemId, ...patch }] });
  }, [selection, scheduleSave]);

  // Update slide background (clear gradient/image when picking a solid color)
  const handleBgChange = useCallback((bg: Partial<SlideBackground>) => {
    const nextBackground = mergeSlideBackground(activeSlide.background, bg);
    setGraph((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) =>
        i !== activeSlideIndex ? slide : { ...slide, background: nextBackground }
      ),
    }));
    scheduleSave({ slideBackground: { slideId: activeSlide.id, background: nextBackground } });
  }, [activeSlideIndex, activeSlide, scheduleSave]);

  // Add element to active slide
  const handleAddElement = useCallback((type: SlideElement["type"]) => {
    const index = activeSlide.elements.length;
    const frame = defaultElementFrame(index, type);
    const newEl: SlideElement = type === "image"
      ? { id: uid(), type: "image", src: "", alt: "", frame }
      : type === "bullet-list"
      ? { id: uid(), type: "bullet-list", items: ["Пункт 1", "Пункт 2"], frame }
      : { id: uid(), type, content: type === "heading" ? "Заголовок" : "Текст", frame };

    setGraph((prev) => ({
      ...prev,
      slides: prev.slides.map((slide, i) =>
        i !== activeSlideIndex ? slide : { ...slide, freeform: true, elements: [...slide.elements, newEl] }
      ),
    }));
    setSelection({ slideId: activeSlide.id, elemId: newEl.id });
    scheduleSave({ addElement: { slideId: activeSlide.id, element: newEl } });
  }, [activeSlideIndex, activeSlide, scheduleSave]);

  // Delete selected element
  const handleDeleteElement = useCallback(() => {
    if (!selection) return;
    setGraph((prev) => ({
      ...prev,
      slides: prev.slides.map((slide) =>
        slide.id !== selection.slideId ? slide : {
          ...slide, elements: slide.elements.filter((el) => el.id !== selection.elemId),
        }
      ),
    }));
    setSelection(null);
    scheduleSave({ deleteElement: { slideId: selection.slideId, elemId: selection.elemId } });
  }, [selection, scheduleSave]);

  // Move element within slide
  const handleMoveElement = useCallback((dir: "up" | "down") => {
    if (!selection) return;
    const slide = graph.slides.find((s) => s.id === selection.slideId);
    if (!slide) return;
    const els = [...slide.elements];
    const idx = els.findIndex((e) => e.id === selection.elemId);
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= els.length) return;
    [els[idx], els[target]] = [els[target]!, els[idx]!];
    const elemIds = els.map((e) => e.id);
    setGraph((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id !== selection.slideId ? s : { ...s, elements: els }
      ),
    }));
    scheduleSave({ reorderElements: { slideId: selection.slideId, elemIds } });
  }, [graph.slides, selection, scheduleSave]);

  const selectedElemIndex = selection
    ? (graph.slides.find((s) => s.id === selection.slideId)?.elements.findIndex((e) => e.id === selection.elemId) ?? -1)
    : -1;
  const slideElemCount = graph.slides.find((s) => s.id === selection?.slideId)?.elements.length ?? 0;

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
  }, [projectId]);

  const handleDeleteSlide = useCallback(async (slideId: string) => {
    if (!window.confirm("Удалить этот слайд?")) return;
    const newGraph = await callManage({ op: "delete", slideId });
    if (newGraph) setActiveSlideIndex((i) => Math.min(i, newGraph.slides.length - 1));
  }, [callManage]);

  const handleMoveSlide = useCallback(async (index: number, dir: "up" | "down") => {
    const slides = [...graph.slides];
    const target = dir === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= slides.length) return;
    [slides[index], slides[target]] = [slides[target]!, slides[index]!];
    await callManage({ op: "reorder", slideIds: slides.map((s) => s.id) });
    setActiveSlideIndex(target);
  }, [graph.slides, callManage]);

  const handleAddSlide = useCallback(async () => {
    setAddingSlide(true);
    try {
      const newGraph = await callManage({ op: "add", afterSlideId: activeSlide.id });
      if (newGraph) {
        const newIdx = newGraph.slides.findIndex((s) => !graph.slides.some((old) => old.id === s.id));
        if (newIdx !== -1) setActiveSlideIndex(newIdx);
      }
    } finally { setAddingSlide(false); }
  }, [callManage, activeSlide.id, graph.slides]);

  const handleSaveNotes = useCallback(async (notes: string) => {
    setNotesSaving(true);
    try {
      const newGraph = await callManage({ op: "update-notes", slideId: activeSlide.id, notes });
      if (newGraph) setGraph(newGraph);
    } finally { setNotesSaving(false); }
  }, [callManage, activeSlide.id]);

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
          <button type="button" onClick={() => setActiveSlideIndex((i) => Math.max(0, i - 1))} disabled={activeSlideIndex === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-xs font-medium min-w-[52px] text-center">{activeSlideIndex + 1} / {graph.slides.length}</span>
          <button type="button" onClick={() => setActiveSlideIndex((i) => Math.min(graph.slides.length - 1, i + 1))} disabled={activeSlideIndex === graph.slides.length - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
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
        {/* Left: thumbnails */}
        <div className="w-36 shrink-0 border-r border-border bg-muted/20 overflow-y-auto flex flex-col gap-2 p-2">
          {graph.slides.map((slide, i) => (
            <SlideThumbnail
              key={slide.id} slide={slide} theme={graph.meta.theme} index={i}
              active={i === activeSlideIndex}
              onClick={() => { setActiveSlideIndex(i); setSelection(null); }}
              onDelete={() => void handleDeleteSlide(slide.id)}
              onMoveUp={() => void handleMoveSlide(i, "up")}
              onMoveDown={() => void handleMoveSlide(i, "down")}
              canMoveUp={i > 0} canMoveDown={i < graph.slides.length - 1} canDelete={graph.slides.length > 1}
            />
          ))}
          <button type="button" onClick={() => void handleAddSlide()} disabled={addingSlide}
            className="w-full rounded-md border-2 border-dashed border-border/60 hover:border-primary/50 flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-primary transition-colors">
            {addingSlide ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Слайд
          </button>
        </div>

        {/* Center: preview */}
        <div className="flex-1 overflow-hidden bg-[#1a1a2e] flex flex-col items-center justify-center gap-2 p-6">
          <div className="w-full max-w-4xl min-h-0 flex-1" style={{ aspectRatio: "16/9", maxHeight: "calc(100% - 1.5rem)" }}>
            <iframe ref={mainIframeRef} title="Slide preview"
              className="w-full h-full rounded-lg shadow-2xl border-0"
              sandbox="allow-scripts allow-same-origin" />
          </div>
          <p className="text-xs text-white/50 shrink-0">{t("presentations_freeform_hint")}</p>
        </div>

        {/* Right: tabbed panel */}
        <div className="w-72 shrink-0 border-l border-border bg-card flex flex-col shadow-sm">
          <div className="flex border-b border-border shrink-0">
            {([
              { key: "visual" as RightTab, icon: Pencil, label: "Правка" },
              { key: "chat" as RightTab, icon: MessageSquare, label: "AI" },
              { key: "notes" as RightTab, icon: FileText, label: "Заметки" },
            ] as const).map(({ key, icon: Icon, label }) => (
              <button key={key} type="button" onClick={() => setRightTab(key)}
                className={cn("flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2",
                  rightTab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-hidden">
            {rightTab === "visual" && (
              selectedElement ? (
                <PropertiesPanel
                  projectId={projectId}
                  element={selectedElement}
                  onUpdate={handleElementUpdate}
                  onClose={() => setSelection(null)}
                  onDelete={handleDeleteElement}
                  onMoveUp={() => handleMoveElement("up")}
                  onMoveDown={() => handleMoveElement("down")}
                  canMoveUp={selectedElemIndex > 0}
                  canMoveDown={selectedElemIndex < slideElemCount - 1}
                />
              ) : (
                <SlidePanel
                  slide={activeSlide}
                  theme={graph.meta.theme}
                  onBgChange={handleBgChange}
                  onAddElement={handleAddElement}
                />
              )
            )}
            {rightTab === "chat" && (
              <PresentationAgentChat
                projectId={projectId}
                userPlan={userPlan}
                onGraphUpdate={(g) => setGraph(g)}
              />
            )}
            {rightTab === "notes" && <NotesPanel slide={activeSlide} onSave={handleSaveNotes} saving={notesSaving} />}
          </div>
        </div>
      </div>
    </div>
  );
}

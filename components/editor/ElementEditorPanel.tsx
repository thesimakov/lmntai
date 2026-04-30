"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ImageIcon,
  Link2,
  MousePointerClick,
  Send,
  SquareStack,
  Trash2,
  Type,
  Boxes,
  X
} from "lucide-react";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  visualEditorPanelShowsLinkCheckbox,
  type LayoutElementSnapshot
} from "@/lib/editor/layout-element";
import { buildVisualEditorPayload } from "@/lib/editor/AICommandBuilder";
import type { VisualEditorSubmitPayload } from "@/lib/editor/AICommandBuilder";
import { ImageUploader } from "@/components/editor/ImageUploader";
import { LmnyIconPicker } from "@/components/editor/LmnyIconPicker";
import type { MoveToolbarDirection } from "@/lib/editor/canvas-overlay";

type ElementEditorPanelLabels = {
  title: string;
  empty: string;
  submit: string;
  /** aria-label для кнопки закрытия панели */
  close: string;
  fields: {
    text: string;
    color: string;
    size: string;
    alignment: string;
    href: string;
    /** Подпись чекбокса «ссылка внутри текстового блока» (визуальный редактор превью) */
    linkToggle: string;
    icon: string;
    iconColor: string;
    variant: string;
    src: string;
    alt: string;
    width: string;
    height: string;
    borderRadius: string;
    /** URL фона блока (CSS background-image) */
    backgroundImage: string;
  };
  /** Подписи варианта кнопки — в стиле shadcn/ui (`components/ui/button`). */
  buttonVariantOptions: Array<{ value: string; label: string }>;
  /** Подсказка над сеткой иконок LMNY */
  iconLibraryHint: string;
  /** Подпись поля произвольного URL иконки */
  iconManualHint: string;
  /** Очистить иконку (aria) */
  iconClear: string;
  /** Плейсхолдер поля цвета иконки (пусто = currentColor) */
  iconColorPlaceholder: string;
  /** Подписи кнопок перемещения контейнера (дублируют оверлей в iframe). */
  moveBlockUp: string;
  moveBlockDown: string;
  moveBlockLeft: string;
  moveBlockRight: string;
  /** Подписи кнопок структуры блока */
  deleteBlock: string;
  cloneBlock: string;
  upload: string;
  uploading: string;
  imageTypeError: string;
};

type ElementEditorPanelProps = {
  snapshot: LayoutElementSnapshot | null;
  sandboxId: string | null;
  disabled?: boolean;
  labels: ElementEditorPanelLabels;
  onSubmitPayload: (payload: VisualEditorSubmitPayload) => void;
  /** Удалить выбранный узел из DOM превью */
  onDeleteBlock?: () => void;
  /** Дублировать выбранный узел сразу после оригинала */
  onCloneBlock?: () => void;
  /** То же действие направлений, что и стрелки на рамке выделения (↑↓←→ в DOM превью). */
  onMoveBlock?: (direction: MoveToolbarDirection) => void;
  /** Снять выделение в превью и скрыть поля редактирования */
  onClose?: () => void;
};

export type ElementEditorPanelHandle = {
  /** Применить несохранённые правки из формы к DOM перед сохранением HTML (напр. «Сохранить макет»). */
  flushPendingApply: () => boolean;
};

function iconForType(t: string) {
  switch (t) {
    case "image":
      return ImageIcon;
    case "link":
      return Link2;
    case "button":
      return MousePointerClick;
    case "text":
      return Type;
    case "icon":
      return Boxes;
    default:
      return Boxes;
  }
}

function pickChanges(initial: Record<string, string>, cur: Record<string, string>): { field: string; new_value: string }[] {
  const out: { field: string; new_value: string }[] = [];
  const keys = new Set([...Object.keys(initial), ...Object.keys(cur)]);
  keys.forEach((k) => {
    const a = initial[k] ?? "";
    const b = cur[k] ?? "";
    if (a !== b) out.push({ field: k, new_value: b });
  });
  return out;
}

export const ElementEditorPanel = forwardRef<ElementEditorPanelHandle, ElementEditorPanelProps>(
  function ElementEditorPanel(
    { snapshot, sandboxId, disabled, labels, onSubmitPayload, onDeleteBlock, onCloneBlock, onMoveBlock, onClose },
    ref
  ) {
    const [fields, setFields] = useState<Record<string, string>>({});

    useEffect(() => {
      if (!snapshot) {
        setFields({});
        return;
      }
      setFields({ ...snapshot.initialFields });
    }, [snapshot]);

    const updates = useMemo(() => {
      if (!snapshot) return [];
      return pickChanges(snapshot.initialFields, fields);
    }, [snapshot, fields]);

    const canSubmit = snapshot != null && updates.length > 0 && !disabled;

    useImperativeHandle(
      ref,
      () => ({
        flushPendingApply() {
          if (!snapshot || disabled || updates.length === 0) return false;
          onSubmitPayload(buildVisualEditorPayload(snapshot.elementId, snapshot.elementType, updates));
          return true;
        }
      }),
      [snapshot, disabled, updates, onSubmitPayload]
    );

    const Icon = snapshot ? iconForType(snapshot.elementType) : Boxes;

    if (!snapshot) {
      return (
      <div className="flex max-h-[min(36vh,12rem)] flex-col overflow-hidden rounded-xl border border-dashed border-border/70 bg-background/95 shadow-lg ring-1 ring-black/[0.04] backdrop-blur-sm dark:bg-zinc-950/95 dark:ring-white/[0.06]">
        <div className="flex shrink-0 items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-2">
          <span className="size-2.5 shrink-0 rounded-full bg-[hsl(0_62%_54%)]/85" aria-hidden />
          <span className="size-2.5 shrink-0 rounded-full bg-[hsl(48_89%_52%)]/85" aria-hidden />
          <span className="size-2.5 shrink-0 rounded-full bg-[hsl(142_42%_46%)]/75" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">{labels.title}</span>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={labels.close}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
        <div className="px-3 py-3 text-xs text-muted-foreground">{labels.empty}</div>
      </div>
      );
    }

    function field(name: keyof ElementEditorPanelLabels["fields"]) {
    return labels.fields[name];
  }

  const set =
    (key: string) =>
    (v: string): void => {
      setFields((prev) => ({ ...prev, [key]: v }));
    };

  const showBlockBackground =
    snapshot.elementType === "container" ||
    (snapshot.elementType === "text" && "backgroundImage" in snapshot.initialFields);

  const showVisualLinkCheckbox = visualEditorPanelShowsLinkCheckbox(snapshot);

  const linkCheckboxBlock = (
    <>
      <div className="space-y-1">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4 shrink-0 rounded border-input accent-foreground disabled:opacity-50"
            disabled={disabled}
            checked={(fields.linkEnabled ?? "") === "1"}
            onChange={(e) =>
              setFields((p) => ({
                ...p,
                linkEnabled: e.target.checked ? "1" : "",
                ...(e.target.checked ? {} : { href: "" })
              }))
            }
          />
          <span>{labels.fields.linkToggle}</span>
        </label>
      </div>
      {(fields.linkEnabled ?? "") === "1" ? (
        <Field label={field("href")} value={fields.href ?? ""} onChange={set("href")} />
      ) : null}
    </>
  );

  return (
    <div
      className="flex max-h-[min(56vh,28rem)] flex-col overflow-hidden rounded-xl border border-border/90 bg-background shadow-2xl ring-1 ring-black/[0.06] dark:bg-zinc-950 dark:ring-white/[0.08]"
      role="dialog"
      aria-label={labels.title}
    >
      <div className="flex shrink-0 items-center gap-2 border-b border-border/70 bg-gradient-to-b from-muted/90 to-muted/50 px-3 py-2 dark:from-zinc-900 dark:to-zinc-900/80">
        <div className="flex shrink-0 gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[hsl(0_62%_54%)]/90 shadow-sm" />
          <span className="size-2.5 rounded-full bg-[hsl(48_89%_52%)]/90 shadow-sm" />
          <span className="size-2.5 rounded-full bg-[hsl(142_42%_46%)]/80 shadow-sm" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-violet-600/12 text-violet-700 dark:text-violet-300">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold leading-tight text-foreground">{labels.title}</p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {snapshot.elementType.charAt(0).toUpperCase() + snapshot.elementType.slice(1)} · {snapshot.elementId}
            </p>
          </div>
          {onMoveBlock ? (
            <div className="flex shrink-0 flex-wrap justify-end gap-0.5 pr-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 border-border/80"
                disabled={disabled}
                aria-label={labels.moveBlockUp}
                title={labels.moveBlockUp}
                onClick={() => onMoveBlock("up")}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 border-border/80"
                disabled={disabled}
                aria-label={labels.moveBlockDown}
                title={labels.moveBlockDown}
                onClick={() => onMoveBlock("down")}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 border-border/80"
                disabled={disabled}
                aria-label={labels.moveBlockLeft}
                title={labels.moveBlockLeft}
                onClick={() => onMoveBlock("left")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-7 w-7 border-border/80"
                disabled={disabled}
                aria-label={labels.moveBlockRight}
                title={labels.moveBlockRight}
                onClick={() => onMoveBlock("right")}
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : null}
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              aria-label={labels.close}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain px-3 py-3">
        {showVisualLinkCheckbox ? linkCheckboxBlock : null}

        {(snapshot.elementType === "text" || snapshot.elementType === "container") && (
          <>
            <Field label={field("text")} value={fields.text ?? ""} onChange={set("text")} />
            <ColorField label={field("color")} value={fields.color ?? ""} onChange={set("color")} />
            <Field label={field("size")} value={fields.size ?? ""} onChange={set("size")} />
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{field("alignment")}</span>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["left", AlignLeft],
                    ["center", AlignCenter],
                    ["right", AlignRight],
                    ["justify", AlignJustify]
                  ] as const
                ).map(([val, Ico]) => (
                  <Button
                    key={val}
                    type="button"
                    size="sm"
                    variant={(fields.alignment ?? "left") === val ? "default" : "outline"}
                    className="h-8 px-2"
                    onClick={() => setFields((p) => ({ ...p, alignment: val }))}
                  >
                    <Ico className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
            {showBlockBackground ? (
              <div className="space-y-2 border-t border-border/50 pt-3">
                {(fields.backgroundImage ?? "").trim() ? (
                  <div
                    className="h-16 overflow-hidden rounded-md border border-border bg-muted/30 bg-cover bg-center"
                    style={{
                      backgroundImage: `url(${JSON.stringify((fields.backgroundImage ?? "").trim())})`
                    }}
                  />
                ) : null}
                <Field
                  label={field("backgroundImage")}
                  value={fields.backgroundImage ?? ""}
                  onChange={set("backgroundImage")}
                />
                <ImageUploader
                  sandboxId={sandboxId}
                  disabled={disabled}
                  labels={{
                    upload: labels.upload,
                    uploading: labels.uploading,
                    errorType: labels.imageTypeError
                  }}
                  onUploaded={(url) => setFields((p) => ({ ...p, backgroundImage: url }))}
                />
              </div>
            ) : null}
          </>
        )}

        {snapshot.elementType === "link" && (
          <>
            <Field label={field("text")} value={fields.text ?? ""} onChange={set("text")} />
            <Field label={field("href")} value={fields.href ?? ""} onChange={set("href")} />
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{field("icon")}</span>
              <LmnyIconPicker
                value={fields.icon ?? ""}
                onChange={set("icon")}
                disabled={disabled}
                labels={{
                  hint: labels.iconLibraryHint,
                  clear: labels.iconClear,
                  manualPlaceholder: labels.iconManualHint
                }}
              />
            </div>
            <ColorField
              label={field("iconColor")}
              value={fields.iconColor ?? ""}
              onChange={set("iconColor")}
              textPlaceholder={labels.iconColorPlaceholder}
            />
          </>
        )}

        {snapshot.elementType === "button" && (
          <>
            <Field label={field("text")} value={fields.text ?? ""} onChange={set("text")} />
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{field("icon")}</span>
              <LmnyIconPicker
                value={fields.icon ?? ""}
                onChange={set("icon")}
                disabled={disabled}
                labels={{
                  hint: labels.iconLibraryHint,
                  clear: labels.iconClear,
                  manualPlaceholder: labels.iconManualHint
                }}
              />
            </div>
            <ColorField
              label={field("iconColor")}
              value={fields.iconColor ?? ""}
              onChange={set("iconColor")}
              textPlaceholder={labels.iconColorPlaceholder}
            />
            <ColorField label={field("color")} value={fields.color ?? ""} onChange={set("color")} />
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{field("variant")}</span>
              <select
                value={
                  labels.buttonVariantOptions.some((o) => o.value === (fields.variant ?? "default"))
                    ? fields.variant ?? "default"
                    : "default"
                }
                onChange={(e) => setFields((p) => ({ ...p, variant: e.target.value }))}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-xs"
              >
                {labels.buttonVariantOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {snapshot.elementType === "image" && (
          <>
            <div className="overflow-hidden rounded-md border border-border bg-muted/40">
              {(fields.src ?? "").trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fields.src}
                  alt={fields.alt ?? ""}
                  className="mx-auto max-h-36 w-auto object-contain"
                />
              ) : (
                <div className="flex h-24 items-center justify-center text-[11px] text-muted-foreground">—</div>
              )}
            </div>
            <Field label={field("src")} value={fields.src ?? ""} onChange={set("src")} />
            <Field label={field("alt")} value={fields.alt ?? ""} onChange={set("alt")} />
            <div className="grid grid-cols-2 gap-2">
              <Field label={field("width")} value={fields.width ?? ""} onChange={set("width")} />
              <Field label={field("height")} value={fields.height ?? ""} onChange={set("height")} />
            </div>
            <Field label={field("borderRadius")} value={fields.borderRadius ?? ""} onChange={set("borderRadius")} />
            <ImageUploader
              sandboxId={sandboxId}
              disabled={disabled}
              labels={{
                upload: labels.upload,
                uploading: labels.uploading,
                errorType: labels.imageTypeError
              }}
              onUploaded={(url) => setFields((p) => ({ ...p, src: url }))}
            />
          </>
        )}

        {snapshot.elementType === "icon" && (
          <>
            <div className="space-y-1">
              <span className="text-[11px] text-muted-foreground">{field("icon")}</span>
              <LmnyIconPicker
                value={fields.icon ?? ""}
                onChange={set("icon")}
                disabled={disabled}
                labels={{
                  hint: labels.iconLibraryHint,
                  clear: labels.iconClear,
                  manualPlaceholder: labels.iconManualHint
                }}
              />
            </div>
            <ColorField label={field("color")} value={fields.color ?? ""} onChange={set("color")} />
          </>
        )}
      </div>

      <div className="flex shrink-0 gap-2 border-t border-border/70 px-3 py-2 dark:border-zinc-800">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1.5 text-xs"
          disabled={disabled || !onCloneBlock}
          onClick={() => onCloneBlock?.()}
        >
          <SquareStack className="h-3.5 w-3.5 shrink-0" />
          {labels.cloneBlock}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 flex-1 gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled || !onDeleteBlock}
          onClick={() => onDeleteBlock?.()}
        >
          <Trash2 className="h-3.5 w-3.5 shrink-0" />
          {labels.deleteBlock}
        </Button>
      </div>

      <div className="shrink-0 border-t border-border/70 bg-muted/30 px-3 py-2.5 dark:bg-zinc-900/90">
        <Button
          type="button"
          className="h-10 w-full gap-2 bg-violet-600 text-white hover:bg-violet-500"
          disabled={!canSubmit}
          onClick={() => {
            if (!snapshot || updates.length === 0) return;
            onSubmitPayload(buildVisualEditorPayload(snapshot.elementId, snapshot.elementType, updates));
          }}
        >
          <Send className="h-4 w-4 shrink-0" />
          {labels.submit}
        </Button>
      </div>
    </div>
  );
});

ElementEditorPanel.displayName = "ElementEditorPanel";

function cssColorToHex(input: string): string {
  const v = input.trim();
  if (!v) return "#000000";
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const x = v.slice(1);
    return `#${x[0]}${x[0]}${x[1]}${x[1]}${x[2]}${x[2]}`.toLowerCase();
  }
  const rgb = v.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  if (rgb) {
    const r = clampByte(Number(rgb[1]));
    const g = clampByte(Number(rgb[2]));
    const b = clampByte(Number(rgb[3]));
    return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
  }
  return "#000000";
}

function clampByte(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function byteToHex(b: number): string {
  return b.toString(16).padStart(2, "0");
}

function hexToRgbCss(hex: string): string {
  const h = hex.replace("#", "").trim();
  if (h.length === 6 && /^[0-9a-fA-F]+$/i.test(h)) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }
  return hex;
}

/** Поле цвета: палитра + ручной ввод (rgb / hex и т.д.). */
function ColorField({
  label,
  value,
  onChange,
  textPlaceholder
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  /** Подсказка в текстовом поле (например, «пусто = цвет текста»). */
  textPlaceholder?: string;
}) {
  const hex = value?.trim() ? cssColorToHex(value) : "#737373";
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => onChange(hexToRgbCss(e.target.value))}
          className="h-9 w-11 shrink-0 cursor-pointer rounded-md border border-input bg-background p-1 shadow-xs"
          aria-label={label}
        />
        <Input
          value={value}
          placeholder={textPlaceholder}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 min-w-0 flex-1 font-mono text-xs"
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 text-xs" />
    </div>
  );
}

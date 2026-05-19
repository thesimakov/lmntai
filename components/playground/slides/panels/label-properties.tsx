"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import {
  LABEL_MIN_FONT_SIZE_PX,
  LABEL_RADIUS_PRESETS,
  defaultLabelElementStyle,
  labelBorderRadiusToCss,
  labelFontSizeToCss,
  parseLabelBorderRadiusPx,
  parseLabelFontSizePx,
} from "@/lib/slide-graph/label-style";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { cn } from "@/lib/utils";
import { PositionSection } from "./position-section";

interface Props {
  element: SlideElement;
  elementIndex: number;
  onUpdate: (p: Partial<SlideElement>) => void;
}

export function LabelPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  const theme = useSlideStore((s) => s.graph.meta.theme);
  const style = element.style ?? defaultLabelElementStyle(theme);
  const radiusPx = parseLabelBorderRadiusPx(style.borderRadius);
  const fontSizePx = parseLabelFontSizePx(style.fontSize);

  const patchStyle = (patch: Partial<NonNullable<SlideElement["style"]>>) => {
    const base = element.style ?? defaultLabelElementStyle(theme);
    onUpdate({ style: { ...base, ...patch } });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Этикетка
        </p>
        <textarea
          className="w-full resize-none rounded-md border border-border bg-background p-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          rows={2}
          value={element.content ?? ""}
          onChange={(e) => onUpdate({ content: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Размер текста
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">{fontSizePx}px</span>
        </div>
        <input
          type="number"
          min={LABEL_MIN_FONT_SIZE_PX}
          max={72}
          step={1}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          value={fontSizePx}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (!Number.isFinite(next)) return;
            patchStyle({ fontSize: labelFontSizeToCss(next) });
          }}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Цвет фона
        </p>
        <div className="flex gap-2">
          <input
            type="color"
            className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border"
            value={style.backgroundColor ?? "#e9f3ec"}
            onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
          />
          <input
            type="text"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            value={style.backgroundColor ?? "#e9f3ec"}
            onChange={(e) => patchStyle({ backgroundColor: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Цвет текста
        </p>
        <div className="flex gap-2">
          <input
            type="color"
            className="h-9 w-12 shrink-0 cursor-pointer rounded border border-border"
            value={style.color ?? "#5a7a6a"}
            onChange={(e) => patchStyle({ color: e.target.value })}
          />
          <input
            type="text"
            className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            value={style.color ?? "#5a7a6a"}
            onChange={(e) => patchStyle({ color: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Скругление углов
          </p>
          <span className="font-mono text-[10px] text-muted-foreground">
            {radiusPx >= 9999 ? "pill" : `${radiusPx}px`}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={48}
          step={1}
          value={Math.min(radiusPx, 48)}
          onChange={(e) =>
            patchStyle({ borderRadius: labelBorderRadiusToCss(Number(e.target.value)) })
          }
          className="w-full accent-primary"
        />
        <div className="flex flex-wrap gap-1">
          {LABEL_RADIUS_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => patchStyle({ borderRadius: labelBorderRadiusToCss(preset.px) })}
              className={cn(
                "rounded border px-2 py-1 text-[10px] font-medium transition-colors",
                radiusPx === preset.px || (preset.px === 9999 && radiusPx >= 9999)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
    </div>
  );
}

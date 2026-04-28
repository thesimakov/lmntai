"use client";

import { Check, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LMNY_SVG_ICON_IDS, isLmnySvgIconPath, lmnySvgIconSrc } from "@/lib/editor/lmny-svg-icons";
import { cn } from "@/lib/utils";

type LmnyIconPickerLabels = {
  hint: string;
  clear: string;
  manualPlaceholder: string;
};

type LmnyIconPickerProps = {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  labels: LmnyIconPickerLabels;
};

export function LmnyIconPicker({ value, onChange, disabled, labels }: LmnyIconPickerProps) {
  const trimmed = value.trim();
  const selectedId = LMNY_SVG_ICON_IDS.find((id) => lmnySvgIconSrc(id) === trimmed || trimmed.endsWith(`/${id}.svg`));

  return (
    <div className="space-y-2">
      <span className="text-[11px] text-muted-foreground">{labels.hint}</span>
      <div className="max-h-36 overflow-y-auto overflow-x-hidden rounded-md border border-border/80 bg-muted/20 p-2 [scrollbar-gutter:stable]">
        <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-7">
          {LMNY_SVG_ICON_IDS.map((id) => {
            const src = lmnySvgIconSrc(id);
            const active = selectedId === id;
            return (
              <button
                key={id}
                type="button"
                disabled={disabled}
                title={id}
                onClick={() => onChange(src)}
                className={cn(
                  "flex aspect-square items-center justify-center rounded-md border bg-background p-1 transition-colors",
                  active
                    ? "border-violet-500 ring-1 ring-violet-400/60"
                    : "border-border/60 hover:border-violet-400/50 hover:bg-muted/60"
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="size-5 object-contain" loading="lazy" />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <span className="text-[10px] text-muted-foreground">{labels.manualPlaceholder}</span>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/svg-lmny/star.svg"
            disabled={disabled}
            className="h-9 font-mono text-xs"
          />
        </div>
        {trimmed ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mt-5 h-9 w-9 shrink-0"
            disabled={disabled}
            title={labels.clear}
            aria-label={labels.clear}
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {trimmed && isLmnySvgIconPath(trimmed) ? (
        <div className="flex items-center gap-2 rounded-md border border-border/50 bg-background/80 px-2 py-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trimmed} alt="" className="size-6 object-contain" />
          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span className="truncate font-mono text-[10px] text-muted-foreground">{trimmed}</span>
        </div>
      ) : null}
    </div>
  );
}

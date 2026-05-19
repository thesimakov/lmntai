"use client";

import type { SlideElement, SlideElementFrame } from "@/lib/slide-graph/types";
import { isSlideElementLocked } from "@/lib/slide-graph/element-lock";
import { clampFrame, defaultElementFrame } from "@/lib/slide-graph/freeform";

interface PositionSectionProps {
  element: SlideElement;
  elementIndex: number;
  onUpdate: (patch: Partial<SlideElement>) => void;
}

function NumInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</span>
      <input
        type="number"
        className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function PositionSection({ element, elementIndex, onUpdate }: PositionSectionProps) {
  const frame = element.frame ?? defaultElementFrame(elementIndex, element.type);

  const update = (patch: Partial<SlideElementFrame>) => {
    onUpdate({ frame: clampFrame({ ...frame, ...patch }) });
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Позиция и размер</p>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="X" value={frame.x} onChange={(x) => update({ x })} />
        <NumInput label="Y" value={frame.y} onChange={(y) => update({ y })} />
        <NumInput label="W" value={frame.w} onChange={(w) => update({ w })} />
        <NumInput label="H" value={frame.h} onChange={(h) => update({ h })} />
      </div>
      <div className="flex items-center gap-3 pt-1">
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={isSlideElementLocked(element)}
            onChange={(e) => onUpdate({ locked: e.target.checked })}
            className="rounded"
          />
          Lock
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={element.visible !== false}
            onChange={(e) => onUpdate({ visible: e.target.checked })}
            className="rounded"
          />
          Visible
        </label>
      </div>
      <div>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wide">Layer name</span>
        <input
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary mt-1"
          placeholder={element.type}
          value={element.name ?? ""}
          onChange={(e) => onUpdate({ name: e.target.value || undefined })}
        />
      </div>
    </div>
  );
}

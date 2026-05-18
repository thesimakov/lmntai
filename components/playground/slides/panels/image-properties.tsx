"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function ImagePropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">URL</p>
        <input
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="https://..."
          value={element.src ?? ""}
          onChange={(e) => onUpdate({ src: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Alt</p>
        <input
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Description"
          value={element.alt ?? ""}
          onChange={(e) => onUpdate({ alt: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Прозрачность</p>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          className="w-full"
          value={element.style?.opacity ?? 1}
          onChange={(e) => onUpdate({ style: { ...element.style, opacity: Number(e.target.value) } })}
        />
      </div>

      <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
    </div>
  );
}

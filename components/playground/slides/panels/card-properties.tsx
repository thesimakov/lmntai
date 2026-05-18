"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function CardPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  return (
    <div className="space-y-4">
      {element.label !== undefined && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Label</p>
          <input
            className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            value={element.label ?? ""}
            onChange={(e) => onUpdate({ label: e.target.value })}
          />
        </div>
      )}

      {element.description !== undefined && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Description</p>
          <textarea
            className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            rows={3}
            value={element.description ?? ""}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Цвет текста</p>
        <input
          type="color"
          className="w-full h-8 rounded border border-border cursor-pointer"
          value={element.style?.color ?? "#000000"}
          onChange={(e) => onUpdate({ style: { ...element.style, color: e.target.value } })}
        />
      </div>

      <PositionSection element={element} elementIndex={elementIndex} onUpdate={onUpdate} />
    </div>
  );
}

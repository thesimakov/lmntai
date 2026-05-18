"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { Bold, Italic } from "lucide-react";
import { cn } from "@/lib/utils";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function TextPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  const isBold = element.style?.fontWeight === "bold";
  const isItalic = !!element.style?.italic;

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Текст</p>
        <textarea
          className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          rows={4}
          value={element.content ?? ""}
          onChange={(e) => onUpdate({ content: e.target.value })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Стиль</p>
        <div className="flex gap-1.5">
          <button type="button"
            onClick={() => onUpdate({ style: { ...element.style, fontWeight: isBold ? "normal" : "bold" } })}
            className={cn("flex-1 h-8 rounded border flex items-center justify-center text-xs font-bold transition-colors",
              isBold ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button type="button"
            onClick={() => onUpdate({ style: { ...element.style, italic: !isItalic } })}
            className={cn("flex-1 h-8 rounded border flex items-center justify-center transition-colors",
              isItalic ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
            <Italic className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex gap-1">
          {(["left", "center", "right"] as const).map((align) => (
            <button key={align} type="button"
              onClick={() => onUpdate({ style: { ...element.style, textAlign: align } })}
              className={cn("flex-1 h-7 rounded border text-[10px] font-medium transition-colors",
                element.style?.textAlign === align ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
              {align === "left" ? "←" : align === "center" ? "↔" : "→"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Размер</p>
        <input
          type="number"
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="px"
          value={parseFloat(element.style?.fontSize ?? "") || ""}
          onChange={(e) => onUpdate({ style: { ...element.style, fontSize: `${e.target.value}px` } })}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Цвет</p>
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

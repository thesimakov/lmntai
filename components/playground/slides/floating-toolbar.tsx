"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { defaultElementFrame } from "@/lib/slide-graph/freeform";
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface FloatingToolbarProps {
  element: SlideElement;
  elementIndex: number;
  onUpdate: (patch: Partial<SlideElement>) => void;
  onDelete: () => void;
}

export function FloatingToolbar({ element, elementIndex, onUpdate, onDelete }: FloatingToolbarProps) {
  const frame = element.frame ?? defaultElementFrame(elementIndex, element.type);
  const isBold = element.style?.fontWeight === "bold";
  const isItalic = !!element.style?.italic;

  const btn = "w-7 h-7 rounded flex items-center justify-center text-xs font-bold transition-colors";
  const active = "bg-primary text-primary-foreground";
  const inactive = "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div
      style={{
        position: "absolute",
        left: frame.x,
        top: frame.y - 40,
        zIndex: 1002,
        pointerEvents: "all",
      }}
    >
      <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg px-1.5 py-1 shadow-lg">
        <button
          type="button"
          className={cn(btn, isBold ? active : inactive)}
          onClick={() => onUpdate({ style: { ...element.style, fontWeight: isBold ? "normal" : "bold" } })}
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          className={cn(btn, isItalic ? active : inactive)}
          onClick={() => onUpdate({ style: { ...element.style, italic: !isItalic } })}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-4 bg-border mx-0.5" />
        {(["left", "center", "right"] as const).map((align) => {
          const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
          return (
            <button
              key={align}
              type="button"
              className={cn(btn, element.style?.textAlign === align ? active : inactive)}
              onClick={() => onUpdate({ style: { ...element.style, textAlign: align } })}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
        <div className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          className={cn(btn, "text-destructive hover:bg-destructive/10")}
          onClick={onDelete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

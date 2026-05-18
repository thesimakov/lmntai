"use client";

import { Eye, EyeOff, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import type { SlideElement } from "@/lib/slide-graph/types";

interface LayersPanelProps {
  slideId: string
  elements: SlideElement[]
}

export function LayersPanel({ slideId, elements }: LayersPanelProps) {
  const selectedElemId = useEditorStore((s) => s.selectedElemId);
  const setSelectedElemId = useEditorStore((s) => s.setSelectedElemId);
  const updateElement = useSlideStore((s) => s.updateElement);

  // Reverse order: topmost layer first
  const sorted = [...elements].reverse();

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Слои</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((el) => {
          const isSelected = el.id === selectedElemId;
          const isVisible = el.visible !== false;
          const isLocked = !!el.locked;

          return (
            <div
              key={el.id}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-xs",
                isSelected && "bg-primary/10 text-primary"
              )}
              onClick={() => setSelectedElemId(isSelected ? null : el.id)}
            >
              <span className="flex-1 truncate text-[11px]">{el.name ?? el.type}</span>
              <button
                type="button"
                title={isVisible ? "Hide" : "Show"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(slideId, el.id, { visible: !isVisible });
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                title={isLocked ? "Unlock" : "Lock"}
                onClick={(e) => {
                  e.stopPropagation();
                  updateElement(slideId, el.id, { locked: !isLocked });
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
              >
                {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              </button>
            </div>
          );
        })}
        {elements.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-muted-foreground">
            Нет элементов
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import { Eye, EyeOff, GripVertical, Lock, Unlock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/lib/stores/use-editor-store";
import { useSlideStore } from "@/lib/stores/use-slide-store";
import { isSlideElementLocked } from "@/lib/slide-graph/element-lock";
import type { SlideElement } from "@/lib/slide-graph/types";

interface LayersPanelProps {
  slideId: string;
  elements: SlideElement[];
}

/** Panel order is top-first; graph order is bottom-first. */
function reorderElementIds(
  elements: SlideElement[],
  fromId: string,
  toId: string
): string[] | null {
  const sorted = [...elements].reverse();
  const fromIdx = sorted.findIndex((e) => e.id === fromId);
  const toIdx = sorted.findIndex((e) => e.id === toId);
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return null;
  const next = [...sorted];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next.reverse().map((e) => e.id);
}

export function LayersPanel({ slideId, elements }: LayersPanelProps) {
  const selectedElemId = useEditorStore((s) => s.selectedElemId);
  const setSelectedElemId = useEditorStore((s) => s.setSelectedElemId);
  const updateElement = useSlideStore((s) => s.updateElement);
  const reorderElements = useSlideStore((s) => s.reorderElements);

  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sorted = [...elements].reverse();

  const commitReorder = useCallback(
    (fromId: string, toId: string) => {
      const ids = reorderElementIds(elements, fromId, toId);
      if (ids) reorderElements(slideId, ids);
    },
    [elements, reorderElements, slideId]
  );

  const clearDrag = useCallback(() => {
    setDragId(null);
    setOverId(null);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-border">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Слои
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sorted.map((el) => {
          const isSelected = el.id === selectedElemId;
          const isVisible = el.visible !== false;
          const isLocked = isSlideElementLocked(el);
          const isDragging = dragId === el.id;
          const isDropTarget = overId === el.id && dragId !== null && dragId !== el.id;

          return (
            <div
              key={el.id}
              className={cn(
                "flex items-center gap-1 px-2 py-2 cursor-pointer hover:bg-muted/50 transition-colors text-xs border-t-2 border-transparent",
                isSelected && "bg-primary/10 text-primary",
                isDragging && "opacity-40",
                isDropTarget && "border-t-primary"
              )}
              onClick={() => setSelectedElemId(isSelected ? null : el.id)}
              onDragOver={(e) => {
                if (!dragId || dragId === el.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                setOverId(el.id);
              }}
              onDragLeave={() => {
                if (overId === el.id) setOverId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragId) commitReorder(dragId, el.id);
                clearDrag();
              }}
            >
              <span
                draggable={!isLocked}
                title={isLocked ? "Разблокируйте слой для перемещения" : "Перетащите для изменения порядка"}
                onDragStart={(e) => {
                  if (isLocked) {
                    e.preventDefault();
                    return;
                  }
                  e.stopPropagation();
                  setDragId(el.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragEnd={clearDrag}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "shrink-0 text-muted-foreground touch-none",
                  isLocked
                    ? "cursor-not-allowed opacity-30"
                    : "cursor-grab active:cursor-grabbing hover:text-foreground"
                )}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </span>
              <span className="flex-1 truncate text-[11px]">{el.name ?? el.type}</span>
              <button
                type="button"
                title={isVisible ? "Скрыть" : "Показать"}
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
                title={isLocked ? "Разблокировать" : "Заблокировать"}
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

"use client";

import type { SlideElement } from "@/lib/slide-graph/types";
import { Plus, Trash2 } from "lucide-react";
import { PositionSection } from "./position-section";

interface Props { element: SlideElement; elementIndex: number; onUpdate: (p: Partial<SlideElement>) => void }

export function ListPropertiesPanel({ element, elementIndex, onUpdate }: Props) {
  const items = element.items ?? [];

  const updateItem = (i: number, value: string) => {
    const next = [...items];
    next[i] = value;
    onUpdate({ items: next });
  };

  const addItem = () => onUpdate({ items: [...items, ""] });
  const removeItem = (i: number) => onUpdate({ items: items.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Пункты</p>
          <button type="button" onClick={addItem} className="text-primary hover:opacity-70">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {items.map((item, i) => (
            <div key={i} className="flex gap-1.5 items-center">
              <input
                className="flex-1 text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                value={item}
                onChange={(e) => updateItem(i, e.target.value)}
              />
              <button type="button" onClick={() => removeItem(i)} className="text-destructive hover:opacity-70">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
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

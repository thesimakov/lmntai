"use client";

import { useDraggable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GridModel } from "@/lib/template-layer-editor/types";
import { hasEmptyCell } from "@/lib/template-layer-editor/grid-logic";
import type { BlockPreset } from "@/lib/template-layer-editor/types";
import { cn } from "@/lib/utils";

export const PALETTE_DRAG_PREFIX = "tl-palette";

export function paletteDragId(presetId: string): string {
  return `${PALETTE_DRAG_PREFIX}:${presetId}`;
}

export function parsePaletteDragId(id: string | number): string | null {
  const s = String(id);
  if (!s.startsWith(`${PALETTE_DRAG_PREFIX}:`)) return null;
  return s.slice(PALETTE_DRAG_PREFIX.length + 1);
}

interface PaletteProps {
  presets: BlockPreset[];
  grid: GridModel;
  onQuickAdd: (presetId: string) => void;
  /** Заголовок секции (по умолчанию — «Палитра блоков») */
  title?: string;
  /** Показывать, когда список пресетов пуст (например после поиска) */
  emptyHint?: string | null;
}

export function PaletteRail({
  presets,
  grid,
  onQuickAdd,
  title = "Палитра блоков",
  emptyHint = null
}: PaletteProps) {
  const anyEmpty = hasEmptyCell(grid);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {emptyHint && presets.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-2 py-4 text-[11px] text-muted-foreground">{emptyHint}</p>
      ) : null}
      <div className="flex flex-col gap-2">
        {presets.map((p) => (
          <PaletteChip key={p.id} preset={p} disabled={!anyEmpty} onQuickAdd={() => onQuickAdd(p.id)} />
        ))}
      </div>
      {!anyEmpty ? (
        <p className="text-[10px] leading-snug text-muted-foreground">Нет пустых ячеек — добавление недоступно.</p>
      ) : null}
    </div>
  );
}

function PaletteChip({
  preset,
  disabled,
  onQuickAdd
}: {
  preset: BlockPreset;
  disabled: boolean;
  onQuickAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: paletteDragId(preset.id),
    disabled,
    data: { kind: "palette", presetId: preset.id }
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: 0.95 }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-card p-2 shadow-sm",
        disabled ? "opacity-45" : "",
        isDragging && "z-50 ring-2 ring-primary"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex flex-1 cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm active:cursor-grabbing",
          disabled ? "cursor-not-allowed" : ""
        )}
        {...listeners}
        {...attributes}
      >
        <span className="rounded-md px-1.5 py-0.5 font-mono text-[11px] text-white" style={{ backgroundColor: preset.color }}>
          {preset.icon ?? "·"}
        </span>
        <span className="truncate">{preset.title}</span>
      </button>
      <Button type="button" variant="secondary" size="icon" className="h-8 w-8 shrink-0" disabled={disabled} onClick={onQuickAdd}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

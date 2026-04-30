"use client";

import { useDroppable } from "@dnd-kit/core";
import type { GridModel } from "@/lib/template-layer-editor/types";
import { cellKey as gridCellKey } from "@/lib/template-layer-editor/grid-logic";
import { TemplateBlock } from "@/components/template-layer-editor/block";
import { cn } from "@/lib/utils";

export const DROP_PREFIX = "tl-cell";

export function dropIdForCell(row: number, col: number): string {
  return `${DROP_PREFIX}:${gridCellKey(row, col)}`;
}

export function parseDropId(raw: string | number): { row: number; col: number } | null {
  const s = String(raw);
  if (!s.startsWith(`${DROP_PREFIX}:`)) return null;
  const rest = s.slice(DROP_PREFIX.length + 1);
  const m = rest.match(/^(\d+)-(\d+)$/);
  if (!m) return null;
  return { row: Number(m[1]), col: Number(m[2]) };
}

interface GridCellProps {
  row: number;
  col: number;
  grid: GridModel;
  highlightedKeys: Set<string>;
  blockId?: string | null;
  onRemoveBlock?: (instanceId: string) => void;
}

export function GridCellOverlay({ row, col, grid, highlightedKeys, blockId, onRemoveBlock }: GridCellProps) {
  const key = gridCellKey(row, col);
  const { setNodeRef, isOver } = useDroppable({
    id: dropIdForCell(row, col),
    data: { type: "cell", row, col }
  });

  const mark = highlightedKeys.has(key);
  const inst = blockId ? grid.blocks[blockId] : undefined;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative flex min-h-[4.5rem] flex-col rounded-md border border-dashed border-zinc-500/50 bg-zinc-950/40 p-1 transition-colors",
        mark && "border-emerald-400/80 bg-emerald-500/10 ring-1 ring-emerald-400/50",
        isOver && mark && "bg-emerald-500/20",
        !mark && isOver && "border-amber-400/50"
      )}
    >
      {inst ? (
        <TemplateBlock
          block={inst}
          onRemove={onRemoveBlock ? () => onRemoveBlock(inst.id) : undefined}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-[10px] text-zinc-500">{key}</div>
      )}
    </div>
  );
}

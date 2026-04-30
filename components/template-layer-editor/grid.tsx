"use client";

import { useMemo } from "react";
import { GridCellOverlay, dropIdForCell } from "@/components/template-layer-editor/grid-cell";
import { cellKey } from "@/lib/template-layer-editor/grid-logic";
import type { GridModel } from "@/lib/template-layer-editor/types";
import { cn } from "@/lib/utils";

interface TemplateGridProps {
  grid: GridModel;
  highlightedKeys: Set<string>;
  className?: string;
  onRemoveBlock?: (instanceId: string) => void;
}

export function TemplateGrid({ grid, highlightedKeys, className, onRemoveBlock }: TemplateGridProps) {
  const cells = useMemo(() => {
    const out: { row: number; col: number }[] = [];
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.columns; c++) {
        out.push({ row: r, col: c });
      }
    }
    return out;
  }, [grid.rows, grid.columns]);

  return (
    <div
      className={cn("grid gap-2", className)}
      style={{
        gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`
      }}
    >
      {cells.map(({ row: r, col: c }) => {
        const k = cellKey(r, c);
        const bid = grid.occupancy[k];
        return (
          <GridCellOverlay
            key={dropIdForCell(r, c)}
            row={r}
            col={c}
            grid={grid}
            highlightedKeys={highlightedKeys}
            blockId={bid}
            onRemoveBlock={onRemoveBlock}
          />
        );
      })}
    </div>
  );
}

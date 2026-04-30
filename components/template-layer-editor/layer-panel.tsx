"use client";

import { Layers } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { LayerConfig } from "@/lib/template-layer-editor/types";

interface LayerPanelProps {
  layers: LayerConfig[];
  gridLayerId: string;
  onRename: (id: string, name: string) => void;
  onVisibility: (id: string, v: boolean) => void;
}

export function LayerPanel({ layers, gridLayerId, onRename, onVisibility }: LayerPanelProps) {
  const sorted = [...layers].sort((a, b) => {
    if (a.behindGrid !== b.behindGrid) return a.behindGrid ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Layers className="h-4 w-4" />
        Слои макета
      </div>
      <ul className="space-y-2">
        {sorted.map((L) => (
          <li
            key={L.id}
            className="flex flex-col gap-1 rounded-lg border border-border bg-muted/40 p-2 text-xs dark:bg-zinc-950/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <span className="flex items-center gap-1.5 text-[10px] uppercase text-muted-foreground">
                  {L.role === "grid" ? "Сетка (DnD)" : L.role}
                  {L.id === gridLayerId ? (
                    <span className="rounded bg-primary/15 px-1 py-0 font-mono text-[9px] text-primary">основной</span>
                  ) : null}
                  {L.behindGrid ? (
                    <span className="rounded bg-zinc-700/30 px-1 py-0 font-mono text-[9px]">позади</span>
                  ) : (
                    <span className="rounded bg-zinc-700/30 px-1 py-0 font-mono text-[9px]">над/под</span>
                  )}
                </span>
                <Input value={L.name} className="h-8 text-[12px]" onChange={(ev) => onRename(L.id, ev.target.value)} />
              </div>
              <div className="flex flex-col items-end gap-1 pt-4">
                <Switch checked={L.visible} onCheckedChange={(v) => onVisibility(L.id, Boolean(v))} aria-label="Видимость слоя" />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[10px] leading-snug text-muted-foreground">
        Перетаскивание возможно только для блоков основного слоя-сетки; декоративные слои меняют только состав превью и экспортов.
      </p>
    </div>
  );
}

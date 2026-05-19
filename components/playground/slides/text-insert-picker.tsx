"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { InsertTextPreset } from "@/lib/slide-graph/create-element";

const PRESETS: {
  id: InsertTextPreset;
  label: string;
  hint?: string;
}[] = [
  { id: "title", label: "Название", hint: "! Title" },
  { id: "heading-1", label: "Заголовок 1", hint: "# Heading 1" },
  { id: "heading-2", label: "Заголовок 2", hint: "## Heading 2" },
  { id: "heading-3", label: "Заголовок 3", hint: "### Heading 3" },
  { id: "heading-4", label: "Заголовок 4", hint: "#### Heading 4" },
  { id: "quote", label: "Blockquote", hint: "> Quote" },
  { id: "label", label: "Этикетка" },
];

function PresetIcon({ preset }: { preset: InsertTextPreset }) {
  const blue = "text-blue-600";
  const blueLight = "text-blue-300";

  switch (preset) {
    case "title":
      return (
        <span className={cn("text-[1.75rem] font-serif font-bold leading-none", blue)}>
          T
        </span>
      );
    case "heading-1":
      return (
        <span className="flex items-baseline gap-0.5 text-xl font-bold leading-none">
          <span className={blueLight}>H</span>
          <span className={blue}>1</span>
        </span>
      );
    case "heading-2":
      return (
        <span className="flex items-baseline gap-0.5 text-xl font-bold leading-none">
          <span className={blueLight}>H</span>
          <span className={blue}>2</span>
        </span>
      );
    case "heading-3":
      return (
        <span className="flex items-baseline gap-0.5 text-xl font-bold leading-none">
          <span className={blueLight}>H</span>
          <span className={blue}>3</span>
        </span>
      );
    case "heading-4":
      return (
        <span className="flex items-baseline gap-0.5 text-xl font-bold leading-none">
          <span className={blueLight}>H</span>
          <span className={blue}>4</span>
        </span>
      );
    case "quote":
      return (
        <span className="flex h-7 w-8 flex-col justify-center gap-1">
          <span className="h-0.5 w-full rounded bg-blue-300" />
          <span className="h-0.5 w-3/4 rounded bg-blue-600" />
          <span className="h-0.5 w-full rounded bg-blue-300" />
        </span>
      );
    case "label":
      return (
        <span className="rounded-full bg-[#e9f3ec] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#5a7a6a]">
          ЭТИКЕТКА
        </span>
      );
    default:
      return null;
  }
}

export function TextInsertPicker({
  open,
  anchorRef,
  onClose,
  onSelect,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (preset: InsertTextPreset) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={menuRef}
      className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,340px)] rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
    >
      <p className="mb-2.5 text-sm font-semibold text-slate-900">Текст</p>
      <div className="grid grid-cols-3 gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => {
              onSelect(preset.id);
              onClose();
            }}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors",
              preset.id === "label"
                ? "border-transparent bg-[#f4faf6] hover:bg-[#eaf4ee]"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <PresetIcon preset={preset.id} />
            {preset.id !== "label" && (
              <span className="text-[11px] font-medium leading-tight text-slate-800">
                {preset.label}
              </span>
            )}
            {preset.hint && (
              <span className="text-[10px] leading-tight text-slate-400">{preset.hint}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

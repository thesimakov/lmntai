"use client";

import { useDraggable } from "@dnd-kit/core";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import type { BlockInstance as BlockShape } from "@/lib/template-layer-editor/types";
import { cn } from "@/lib/utils";

const DRAGGABLE_PREFIX = "tl-block";

export function parseBlockDragId(id: string | number): string | null {
  const s = String(id);
  if (!s.startsWith(`${DRAGGABLE_PREFIX}:`)) return null;
  return s.slice(DRAGGABLE_PREFIX.length + 1);
}

export function blockDragId(instanceId: string): string {
  return `${DRAGGABLE_PREFIX}:${instanceId}`;
}

export function TemplateBlock({
  block,
  dragDisabled,
  onRemove
}: {
  block: BlockShape;
  dragDisabled?: boolean;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: blockDragId(block.id),
    disabled: Boolean(dragDisabled),
    data: { kind: "grid-block", instanceId: block.id }
  });

  const transformStyle = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <motion.div
      ref={setNodeRef}
      layout
      layoutId={block.id}
      className={cn(
        "relative flex min-h-[3.5rem] cursor-grab select-none flex-col gap-0.5 rounded-lg border border-white/20 px-2 py-1.5 text-left text-xs font-medium text-white shadow-md active:cursor-grabbing",
        isDragging && "z-50 opacity-90 ring-2 ring-white/40"
      )}
      {...listeners}
      {...attributes}
      style={{
        ...transformStyle,
        backgroundColor: block.color
      }}
    >
      {onRemove ? (
        <button
          type="button"
          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/25 text-white hover:bg-black/40"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Удалить блок"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
      <div className="flex items-center justify-between gap-1">
        <span className="opacity-90">{block.icon}</span>
        <span className="truncate text-[10px] opacity-80">{block.title}</span>
      </div>
      <span className="font-mono text-[9px] opacity-60">{block.id.slice(0, 8)}</span>
    </motion.div>
  );
}

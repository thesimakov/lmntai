"use client";

import type { Slide } from "@/lib/slide-graph/types";

interface Props { slide: Slide; projectId: string }

export function NotesPanel({ slide }: Props) {
  // Notes are read from the slide graph. Saving notes requires a dedicated API call.
  // TODO(Task 15): wire save via the manage API when updateNotes is available in the store.
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Заметки</p>
      <textarea
        className="w-full text-xs border border-border rounded-md p-2 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        rows={10}
        placeholder="Speaker notes..."
        defaultValue={slide.notes ?? ""}
        readOnly
      />
      <p className="text-[9px] text-muted-foreground">Редактируйте заметки через AI.</p>
    </div>
  );
}

"use client";

import type { SlideTheme } from "@/lib/slide-graph/types";

interface Props { theme: SlideTheme; projectId: string }

export function ThemeEditorPanel({ theme, projectId: _ }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Тема (только чтение)</p>
      <p className="text-[11px] text-muted-foreground">Редактируйте тему через AI: «Сделай тему тёмной» или «Измени акцентный цвет на зелёный».</p>
      <div className="space-y-2 mt-2">
        {[
          { label: "Primary", value: theme.primaryColor },
          { label: "Background", value: theme.backgroundColor },
          { label: "Text", value: theme.textColor },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-5 h-5 rounded border border-border shrink-0" style={{ background: value }} />
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-xs ml-auto font-mono">{value}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Font</span>
          <span className="text-xs ml-auto">{theme.fontFamily}</span>
        </div>
      </div>
    </div>
  );
}

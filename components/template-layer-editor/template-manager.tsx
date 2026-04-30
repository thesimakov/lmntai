"use client";

import { useState } from "react";
import { Trash2, LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SavedTemplate } from "@/lib/template-layer-editor/types";

interface TemplateManagerProps {
  templates: SavedTemplate[];
  onSave: (name: string) => void;
  onLoad: (id: string) => void;
  onDelete: (id: string) => void;
}

export function TemplateManager({ templates, onSave, onLoad, onDelete }: TemplateManagerProps) {
  const [name, setName] = useState("Мой шаблон");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <LayoutTemplate className="h-4 w-4" />
        Шаблоны
      </div>
      <div className="flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Имя снимка" className="h-9 text-sm" />
        <Button type="button" size="sm" className="shrink-0" onClick={() => onSave(name)}>
          Сохранить
        </Button>
      </div>
      <ul className="grid max-h-48 gap-2 overflow-y-auto pr-1">
        {templates.length === 0 ? (
          <li className="rounded-md border border-dashed border-border px-2 py-4 text-center text-[11px] text-muted-foreground">
            Пока нет сохранённых шаблонов.
          </li>
        ) : (
          templates
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card p-2 text-xs shadow-sm"
              >
                <button type="button" className="min-w-0 flex-1 text-left font-medium" onClick={() => onLoad(t.id)}>
                  <span className="block truncate">{t.name}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-destructive"
                  onClick={() => onDelete(t.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))
        )}
      </ul>
    </div>
  );
}

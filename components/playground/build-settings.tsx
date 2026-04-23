"use client";

import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function BuildSettings({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto max-w-lg space-y-6", className)}>
      <div>
        <h2 className="text-lg font-semibold text-foreground">Настройки сборки</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Параметры публикации и окружения появятся в следующих версиях. Сейчас используются значения по умолчанию
          песочницы.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Авто‑деплой превью</p>
            <p className="text-xs text-muted-foreground">В разработке</p>
          </div>
          <Switch disabled checked={false} aria-readonly />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Строгий ESLint в CI</p>
            <p className="text-xs text-muted-foreground">В разработке</p>
          </div>
          <Switch disabled checked={false} aria-readonly />
        </div>
      </div>
    </div>
  );
}

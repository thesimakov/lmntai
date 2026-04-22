"use client";

import {
  Code2,
  Database,
  Eye,
  Github,
  History,
  MoreHorizontal,
  Printer,
  RotateCw,
  Settings2,
  Share2,
  Upload
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BuildWorkspaceTab = "preview" | "settings" | "code";

type BuildPreviewChromeProps = {
  tab: BuildWorkspaceTab;
  onTabChange: (t: BuildWorkspaceTab) => void;
  onPublish: () => void;
  addressPath: string;
  onRefresh?: () => void;
};

export function BuildPreviewChrome({
  tab,
  onTabChange,
  onPublish,
  addressPath,
  onRefresh
}: BuildPreviewChromeProps) {
  return (
    <div className="flex shrink-0 flex-col border-b border-border bg-background">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          <Button
            type="button"
            size="sm"
            variant={tab === "preview" ? "default" : "ghost"}
            className={cn("h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm", tab !== "preview" && "text-muted-foreground")}
            onClick={() => onTabChange("preview")}
          >
            <Eye className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Превью</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "code" ? "default" : "ghost"}
            className={cn("h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm", tab !== "code" && "text-muted-foreground")}
            onClick={() => onTabChange("code")}
          >
            <Code2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Код</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "settings" ? "default" : "ghost"}
            className={cn("h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm", tab !== "settings" && "text-muted-foreground")}
            onClick={() => onTabChange("settings")}
          >
            <Settings2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Настройки</span>
          </Button>
        </div>

        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label="История">
          <History className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label="База">
          <Database className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label="Печать">
          <Printer className="h-4 w-4" />
        </Button>

        <div className="ml-auto flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Ещё">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="GitHub">
            <Github className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" className="hidden h-8 rounded-lg px-3 sm:inline-flex">
            Поделиться
            <Share2 className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          <Button type="button" size="sm" className="h-8 rounded-lg px-3" onClick={onPublish}>
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Опубликовать
          </Button>
        </div>
      </div>

      {tab === "preview" ? (
        <div className="flex items-center gap-2 border-t border-border/70 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            aria-label="Обновить превью"
            onClick={onRefresh}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <div className="flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
            <span className="truncate font-mono text-xs text-muted-foreground">{addressPath}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Прежнее имя компонента — оставлено для совместимости со старыми импортами и кэшем сборки. */
export { BuildPreviewChrome as BuildTopbar };

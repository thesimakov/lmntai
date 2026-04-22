"use client";

import { Code2, Eye, Settings2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tab = "preview" | "settings" | "code";

type BuildToolbarProps = {
  tab: Tab;
  onTabChange: (t: Tab) => void;
  onPublish?: () => void;
};

export function BuildToolbar({ tab, onTabChange, onPublish }: BuildToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-3xl border bg-card/70 p-2 shadow-sm">
      <div className="flex items-center gap-2">
        <Button
          variant={tab === "preview" ? "default" : "outline"}
          size="sm"
          className={cn("rounded-2xl", tab === "preview" && "shadow-none")}
          onClick={() => onTabChange("preview")}
        >
          <Eye className="h-4 w-4" />
          Превью
        </Button>
        <Button
          variant={tab === "settings" ? "default" : "outline"}
          size="sm"
          className={cn("rounded-2xl", tab === "settings" && "shadow-none")}
          onClick={() => onTabChange("settings")}
        >
          <Settings2 className="h-4 w-4" />
          Настройки
        </Button>
        <Button
          variant={tab === "code" ? "default" : "outline"}
          size="sm"
          className={cn("rounded-2xl", tab === "code" && "shadow-none")}
          onClick={() => onTabChange("code")}
        >
          <Code2 className="h-4 w-4" />
          Код
        </Button>
      </div>

      <Button size="sm" onClick={onPublish}>
        <Upload className="h-4 w-4" />
        Опубликовать
      </Button>
    </div>
  );
}


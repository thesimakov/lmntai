"use client";

import {
  BookOpen,
  Code2,
  Database,
  Eye,
  FileSearch,
  Github,
  History,
  MoreHorizontal,
  Printer,
  RotateCw,
  Send,
  Settings2,
  Upload
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { BuildTaskFilesDialog } from "@/components/playground/build-task-files-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type BuildWorkspaceTab = "preview" | "settings" | "code";

type BuildPreviewChromeProps = {
  tab: BuildWorkspaceTab;
  onTabChange: (t: BuildWorkspaceTab) => void;
  /** Панель «Поделиться» (Popover студии) */
  shareMenu: ReactNode;
  /** Текущая песочница — для «Файлы задания» */
  sandboxId?: string | null;
  onPublish: () => void;
  publishDisabled?: boolean;
  addressPath: string;
  onRefresh?: () => void;
  /** На вкладке «Превью» — переключатель многострочного ввода в чате */
  previewEditorToggle?: {
    active: boolean;
    onToggle: () => void;
  };
  onHistoryClick?: () => void;
};

export function BuildPreviewChrome({
  tab,
  onTabChange,
  shareMenu,
  sandboxId = null,
  onPublish,
  publishDisabled = false,
  addressPath,
  onRefresh,
  previewEditorToggle,
  onHistoryClick
}: BuildPreviewChromeProps) {
  const [taskFilesOpen, setTaskFilesOpen] = useState(false);
  const { t } = useI18n();

  return (
    <div className="flex shrink-0 min-w-0 flex-col border-b border-border bg-background">
      <div className="flex w-full min-w-0 flex-col gap-2 px-2 py-1.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={tab === "preview" ? "default" : "ghost"}
              className={cn("h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm", tab !== "preview" && "text-muted-foreground")}
              onClick={() => onTabChange("preview")}
            >
              <Eye className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t("build_tab_preview")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "code" ? "default" : "ghost"}
              className={cn("h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm", tab !== "code" && "text-muted-foreground")}
              onClick={() => onTabChange("code")}
            >
              <Code2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t("build_tab_code")}</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "settings" ? "default" : "ghost"}
              className={cn("h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm", tab !== "settings" && "text-muted-foreground")}
              onClick={() => onTabChange("settings")}
            >
              <Settings2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t("build_tab_workspace")}</span>
            </Button>
          </div>

          {previewEditorToggle ? (
            <button
              type="button"
              className={cn(
                "ml-1 inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium sm:text-sm",
                previewEditorToggle.active
                  ? "bg-muted/80 text-foreground"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
              aria-label={t("build_editor_aria")}
              aria-pressed={previewEditorToggle.active}
              onClick={previewEditorToggle.onToggle}
            >
              <Send className="h-3.5 w-3.5 shrink-0" />
              {t("build_editor_label")}
            </button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            disabled={!onHistoryClick}
            aria-label={t("build_aria_history")}
            onClick={onHistoryClick}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label={t("build_aria_database")}>
            <Database className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" disabled aria-label={t("build_aria_print")}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-1 sm:ml-auto sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                aria-label={t("build_aria_more")}
                aria-haspopup="menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">{t("build_studio_label")}</DropdownMenuLabel>
              <DropdownMenuItem
                disabled={!sandboxId}
                onSelect={() => setTaskFilesOpen(true)}
                className="gap-2"
              >
                <FileSearch className="h-4 w-4" />
                {t("build_menu_task_files")}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/docs" className="flex cursor-pointer items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  {t("sidebar_popover_docs")}
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground"
            disabled={publishDisabled}
            aria-label={t("build_aria_github_sandbox")}
            onClick={onPublish}
          >
            <Github className="h-4 w-4" />
          </Button>
          {shareMenu}
          <Button
            type="button"
            size="sm"
            className="h-8 min-w-0 shrink-0 rounded-lg px-2 sm:px-3"
            disabled={publishDisabled}
            onClick={onPublish}
            aria-label={t("build_aria_publish_open")}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5 shrink-0" />
            {t("build_publish")}
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
            aria-label={t("build_aria_refresh_preview")}
            onClick={onRefresh}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <div className="flex min-h-9 min-w-0 flex-1 items-center gap-2 border border-border bg-muted/30 px-3 py-2">
            <span className="truncate font-mono text-xs text-muted-foreground">{addressPath}</span>
          </div>
        </div>
      ) : null}
      <BuildTaskFilesDialog open={taskFilesOpen} onOpenChange={setTaskFilesOpen} sandboxId={sandboxId} />
    </div>
  );
}

/** Прежнее имя компонента — оставлено для совместимости со старыми импортами и кэшем сборки. */
export { BuildPreviewChrome as BuildTopbar };

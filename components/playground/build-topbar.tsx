"use client";

import {
  BookOpen,
  Code2,
  Database,
  Eye,
  FileSearch,
  FileText,
  Github,
  History,
  Home,
  MoreHorizontal,
  Printer,
  PenLine,
  Settings2,
  Upload
} from "lucide-react";
import { useRouter } from "next/navigation";
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type BuildWorkspaceTab = "preview" | "document" | "settings" | "code";

type BuildPreviewChromeProps = {
  tab: BuildWorkspaceTab;
  onTabChange: (t: BuildWorkspaceTab) => void;
  /** Вкладка «Документ» — резюме / HTML-презентация с редактированием */
  documentTabVisible?: boolean;
  /** Панель «Поделиться» (Popover студии) */
  shareMenu: ReactNode;
  /** Текущая песочница — для «Файлы задания» */
  sandboxId?: string | null;
  onPublish: () => void;
  publishDisabled?: boolean;
  /** На вкладке «Превью» — визуальный редактор макета в iframe */
  previewEditorToggle?: {
    active: boolean;
    onToggle: () => void;
  };
  onHistoryClick?: () => void;
  /** Левая колонка чата свернута вручную — показать кнопку раскрытия в шапке превью */
  expandChatRailSlot?: ReactNode;
};

export function BuildPreviewChrome({
  tab,
  onTabChange,
  documentTabVisible = false,
  shareMenu,
  sandboxId = null,
  onPublish,
  publishDisabled = false,
  previewEditorToggle,
  onHistoryClick,
  expandChatRailSlot = null
}: BuildPreviewChromeProps) {
  const [taskFilesOpen, setTaskFilesOpen] = useState(false);
  const { t } = useI18n();
  const router = useRouter();

  return (
    <div className="flex shrink-0 min-w-0 flex-col border-b border-border bg-background">
      <div className="flex w-full min-w-0 flex-col gap-2 px-2 py-1.5 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {expandChatRailSlot ? (
            <TooltipProvider delayDuration={400}>
              <span className="mr-0.5 flex shrink-0 items-center">{expandChatRailSlot}</span>
            </TooltipProvider>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="mr-0.5 shrink-0 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            aria-label={t("nav_home")}
            onClick={() => router.push("/playground")}
          >
            <Home className="h-4 w-4" aria-hidden />
          </Button>
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
            {documentTabVisible ? (
              <Button
                type="button"
                size="sm"
                variant={tab === "document" ? "default" : "ghost"}
                className={cn(
                  "h-8 gap-1.5 rounded-md px-2.5 text-xs sm:text-sm",
                  tab !== "document" && "text-muted-foreground"
                )}
                onClick={() => onTabChange("document")}
              >
                <FileText className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">{t("build_tab_document")}</span>
              </Button>
            ) : null}
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

          {previewEditorToggle && (tab === "preview" || tab === "document") ? (
            <Button
              type="button"
              size="sm"
              variant={previewEditorToggle.active ? "default" : "outline"}
              className={cn(
                "ml-1 h-8 shrink-0 gap-1.5 px-2.5 text-xs font-semibold shadow-sm sm:text-sm",
                previewEditorToggle.active &&
                  "shadow-md ring-2 ring-primary/35 ring-offset-2 ring-offset-background",
                !previewEditorToggle.active &&
                  "border-primary/45 bg-primary/5 text-foreground hover:border-primary/65 hover:bg-primary/12"
              )}
              aria-label={t("build_editor_aria")}
              aria-pressed={previewEditorToggle.active}
              onClick={previewEditorToggle.onToggle}
            >
              <PenLine className="h-4 w-4 shrink-0" aria-hidden />
              {t("build_editor_label")}
            </Button>
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
              <DropdownMenuItem
                className="gap-2"
                onSelect={() => {
                  router.push("/docs");
                }}
              >
                <BookOpen className="h-4 w-4" />
                {t("sidebar_popover_docs")}
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

      <BuildTaskFilesDialog open={taskFilesOpen} onOpenChange={setTaskFilesOpen} sandboxId={sandboxId} />
    </div>
  );
}

/** Прежнее имя компонента — оставлено для совместимости со старыми импортами и кэшем сборки. */
export { BuildPreviewChrome as BuildTopbar };

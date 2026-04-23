"use client";

import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Gift,
  HelpCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MenuDrawerProps = {
  onToggleCollapse?: () => void;
  leftCollapsed?: boolean;
  /** Узкая колонка как в Manus: только иконки, меню справа от rail */
  compact?: boolean;
};

export function MenuDrawer({ onToggleCollapse, leftCollapsed, compact }: MenuDrawerProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recent, setRecent] = useState<Array<{ t: number; text: string }>>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");

  const projectTitleShort = useMemo(() => {
    const value = projectTitle.trim() || t("playground_default_project");
    return value.length > 18 ? `${value.slice(0, 18)}…` : value;
  }, [projectTitle, t]);

  useEffect(() => {
    function readRecent() {
      try {
        const data = JSON.parse(localStorage.getItem("lemnity.recent") ?? "[]") as Array<{ t: number; text: string }>;
        setRecent(data.slice(0, 6));
      } catch {
        setRecent([]);
      }
    }
    readRecent();
    window.addEventListener("lemnity:recent-updated", readRecent);
    return () => window.removeEventListener("lemnity:recent-updated", readRecent);
  }, []);

  useEffect(() => {
    function readProjectTitle() {
      try {
        const data = JSON.parse(localStorage.getItem("lemnity.builder") ?? "{}") as { idea?: string };
        const idea = (data.idea ?? "").trim();
        setProjectTitle(idea || t("playground_default_project"));
      } catch {
        setProjectTitle(t("playground_default_project"));
      }
    }

    readProjectTitle();
    window.addEventListener("storage", readProjectTitle);
    return () => window.removeEventListener("storage", readProjectTitle);
  }, [t]);

  const projectMenuButton = (
    <button
      type="button"
      onClick={() => {
        setOpen((v) => !v);
        setHistoryOpen(false);
      }}
      className={cn(
        "flex items-center gap-2 rounded-2xl border border-border bg-background text-sm font-semibold text-foreground transition hover:bg-accent",
        compact ? "h-9 w-9 justify-center p-0" : "h-10 border-black/10 bg-white/70 px-4 text-zinc-900 hover:bg-white"
      )}
      aria-label={compact ? `${t("playground_menu_project_label")} ${projectTitleShort}` : undefined}
    >
      {compact ? (
        <Menu className="h-4 w-4 text-muted-foreground" />
      ) : (
        <>
          <span className="max-w-[170px] truncate">{projectTitleShort}</span>
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        </>
      )}
    </button>
  );

  const historyButton = (
    <Button
      size="icon"
      variant="outline"
      className={cn("rounded-2xl", compact ? "h-9 w-9" : "h-10 w-10")}
      onClick={() => {
        setHistoryOpen((v) => !v);
        setOpen(false);
      }}
      aria-label={t("build_aria_history")}
    >
      <Clock3 className="h-4 w-4" />
    </Button>
  );

  const collapseButton =
    onToggleCollapse ? (
      <Button
        size="icon"
        variant="outline"
        className={cn("rounded-2xl", compact ? "h-9 w-9" : "h-10 w-10")}
        onClick={onToggleCollapse}
        aria-label={leftCollapsed ? t("playground_menu_expand_left") : t("playground_menu_collapse_left")}
      >
        {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>
    ) : null;

  return (
    <div
      className={cn(
        "relative flex gap-2",
        compact ? "w-full flex-col items-center gap-2" : "items-center"
      )}
    >
      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{projectMenuButton}</TooltipTrigger>
          <TooltipContent side="right" align="center">
            {t("playground_menu_project_label")} {projectTitleShort}
          </TooltipContent>
        </Tooltip>
      ) : (
        projectMenuButton
      )}

      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{historyButton}</TooltipTrigger>
          <TooltipContent side="right" align="center">
            {t("playground_menu_history_tooltip")}
          </TooltipContent>
        </Tooltip>
      ) : (
        historyButton
      )}

      {onToggleCollapse
        ? compact
          ? (
              <Tooltip>
                <TooltipTrigger asChild>{collapseButton}</TooltipTrigger>
                <TooltipContent side="right" align="center">
                  {leftCollapsed ? t("playground_menu_expand_left") : t("playground_menu_collapse_left")}
                </TooltipContent>
              </Tooltip>
            )
          : (
              collapseButton
            )
        : null}

      {open ? (
        <div
          className={cn(
            "absolute z-50 w-[340px] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",
            compact ? "left-full top-0 ml-2" : "left-0 top-[46px]"
          )}
        >
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-2xl bg-white/70 px-2 py-2 text-left hover:bg-white"
            onClick={() => {
              setOpen(false);
              router.push("/playground");
            }}
          >
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-2xl"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                router.push("/playground");
              }}
              aria-label={t("playground_menu_back")}
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{projectTitle}</p>
              <p className="text-xs text-zinc-500">{t("playground_menu_to_account")}</p>
            </div>
          </button>

          <div className="mt-2 rounded-3xl border border-black/10 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">{t("playground_menu_tokens_header")}</p>
              <button type="button" className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-950">
                <span>{t("playground_menu_tokens_zero_left")}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-black/10">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <p className="mt-2 text-xs text-zinc-500">{t("playground_menu_tokens_midnight")}</p>
            <Button
              className="mt-3 w-full rounded-2xl bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setOpen(false);
                router.push("/pricing");
              }}
            >
              {t("playground_menu_add_tokens")}
            </Button>
          </div>

          <div className="mt-2 overflow-hidden rounded-3xl border border-black/10 bg-white/70">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-black/5"
            >
              <span className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-purple-600" />
                {t("playground_menu_free_tokens_row")}
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
            <div className="h-px bg-black/10" />
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-black/5"
            >
              <span className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-zinc-700" />
                {t("playground_menu_help_row")}
              </span>
              <ChevronRight className="h-4 w-4 text-zinc-500" />
            </button>
          </div>
        </div>
      ) : null}

      {historyOpen ? (
        <div
          className={cn(
            "absolute z-50 w-[320px] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",
            compact ? "left-full top-[104px] ml-2" : "left-[110px] top-[46px]"
          )}
        >
          <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
            <p className="text-xs font-semibold text-zinc-700">{t("playground_menu_history_header")}</p>
            <div className="mt-2 space-y-1">
              {recent.length ? (
                recent.slice(0, 8).map((r) => (
                  <div key={r.t} className="truncate rounded-xl bg-white px-3 py-2 text-xs text-zinc-700">
                    {r.text}
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">{t("playground_menu_no_history")}</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


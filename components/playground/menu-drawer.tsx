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

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MenuDrawerProps = {
  onToggleCollapse?: () => void;
  leftCollapsed?: boolean;
  /** Узкая колонка как в Manus: только иконки, меню справа от rail */
  compact?: boolean;
};

export function MenuDrawer({ onToggleCollapse, leftCollapsed, compact }: MenuDrawerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recent, setRecent] = useState<Array<{ t: number; text: string }>>([]);
  const [projectTitle, setProjectTitle] = useState<string>("Проект");

  const projectTitleShort = useMemo(() => {
    const value = projectTitle.trim() || "Проект";
    return value.length > 18 ? `${value.slice(0, 18)}…` : value;
  }, [projectTitle]);

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
        setProjectTitle(idea || "Проект");
      } catch {
        setProjectTitle("Проект");
      }
    }

    readProjectTitle();
    window.addEventListener("storage", readProjectTitle);
    return () => window.removeEventListener("storage", readProjectTitle);
  }, []);

  return (
    <div
      className={cn(
        "relative flex gap-2",
        compact ? "w-full flex-col items-center gap-2" : "items-center"
      )}
    >
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
        aria-label={compact ? `Проект: ${projectTitleShort}` : undefined}
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

      <Button
        size="icon"
        variant="outline"
        className={cn("rounded-2xl", compact ? "h-9 w-9" : "h-10 w-10")}
        onClick={() => {
          setHistoryOpen((v) => !v);
          setOpen(false);
        }}
        aria-label="История"
      >
        <Clock3 className="h-4 w-4" />
      </Button>

      {onToggleCollapse ? (
        <Button
          size="icon"
          variant="outline"
          className={cn("rounded-2xl", compact ? "h-9 w-9" : "h-10 w-10")}
          onClick={onToggleCollapse}
          aria-label={leftCollapsed ? "Раскрыть левую колонку" : "Свернуть левую колонку"}
        >
          {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      ) : null}

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
              aria-label="Назад"
            >
              <ChevronRight className="h-4 w-4 rotate-180" />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900">{projectTitle}</p>
              <p className="text-xs text-zinc-500">В личный кабинет</p>
            </div>
          </button>

          <div className="mt-2 rounded-3xl border border-black/10 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-zinc-900">Токены</p>
              <button type="button" className="flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-950">
                <span>0 осталось</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-black/10">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
            </div>
            <p className="mt-2 text-xs text-zinc-500">Дневные токены обновляются в полночь</p>
            <Button
              className="mt-3 w-full rounded-2xl bg-blue-600 hover:bg-blue-700"
              onClick={() => {
                setOpen(false);
                router.push("/pricing");
              }}
            >
              Добавить токены
            </Button>
          </div>

          <div className="mt-2 overflow-hidden rounded-3xl border border-black/10 bg-white/70">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-zinc-900 hover:bg-black/5"
            >
              <span className="flex items-center gap-3">
                <Gift className="h-5 w-5 text-purple-600" />
                Получить бесплатные токены
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
                Помощь
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
            <p className="text-xs font-semibold text-zinc-700">История</p>
            <div className="mt-2 space-y-1">
              {recent.length ? (
                recent.slice(0, 8).map((r) => (
                  <div key={r.t} className="truncate rounded-xl bg-white px-3 py-2 text-xs text-zinc-700">
                    {r.text}
                  </div>
                ))
              ) : (
                <p className="text-xs text-zinc-500">Пока нет запросов.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}


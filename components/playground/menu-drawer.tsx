"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Clock3,
  Gift,
  HelpCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import { BuildTemplateThumbnail } from "@/components/playground/build-template-thumbnail";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LEMNITY_AI_BRIDGE_API_PREFIX } from "@/lib/lemnity-ai-bridge-config";
import { saveBuilderHandoff } from "@/lib/landing-handoff";
import { cn } from "@/lib/utils";

type MenuDrawerProps = {
  onToggleCollapse?: () => void;
  leftCollapsed?: boolean;
  /** Узкая колонка студии: только иконки, меню справа от rail */
  compact?: boolean;
  /** compact: «stack» — вертикаль у rail; «inline» — ряд в шапке чата */
  toolbarLayout?: "stack" | "inline";
  /** Не показывать кнопку сворачивания rail (например, вынесена в `studioToolbarTrailingSlot` у AgentChat) */
  hideCollapseButton?: boolean;
  /** После bootstrap: не запрашивать API моста до готовности */
  lemnityAiBridgeReady: boolean;
  /** Режим чата через мост Lemnity AI */
  shouldUseLemnityAiBridge: boolean;
};

export type StudioChatRailCollapseButtonProps = {
  leftCollapsed: boolean;
  onToggleCollapse: () => void;
  compact?: boolean;
  /** Без обёртки Tooltip (режим шапки без компактных подсказок) */
  showTooltip?: boolean;
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

export function StudioChatRailCollapseButton({
  leftCollapsed,
  onToggleCollapse,
  compact = false,
  showTooltip = true,
  tooltipSide = "bottom"
}: StudioChatRailCollapseButtonProps) {
  const { t } = useI18n();

  const button = (
    <Button
      size="icon"
      variant="outline"
      className={cn("rounded-2xl", compact ? "h-9 w-9" : "h-10 w-10")}
      onClick={onToggleCollapse}
      aria-label={leftCollapsed ? t("playground_menu_expand_left") : t("playground_menu_collapse_left")}
    >
      {leftCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </Button>
  );

  if (!showTooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={tooltipSide} align="center">
        {leftCollapsed ? t("playground_menu_expand_left") : t("playground_menu_collapse_left")}
      </TooltipContent>
    </Tooltip>
  );
}

type MenuProfileTokens = {
  tokenBalance: number;
  tokenLimit: number;
  tokensUsedToday: number;
};

type LemnityAiSessionListItem = {
  session_id: string;
  title?: string | null;
  latest_message?: string | null;
  latest_message_at?: number | null;
};

/** Сохранённые проекты с сервера (Prisma-сессии моста и/или песочницы) — источник для «Истории» при пустом списке SSE и в режиме без моста */
type SavedProjectRow = {
  id: string;
  name: string;
  editUrl: string;
};

export function MenuDrawer({
  onToggleCollapse,
  leftCollapsed,
  compact,
  toolbarLayout = "stack",
  hideCollapseButton = false,
  lemnityAiBridgeReady,
  shouldUseLemnityAiBridge
}: MenuDrawerProps) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const useLemnityAiBridge = lemnityAiBridgeReady && shouldUseLemnityAiBridge;
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [recent, setRecent] = useState<Array<{ t: number; text: string; templateSlug?: string }>>([]);
  const [lemnityAiHistory, setLemnityAiHistory] = useState<LemnityAiSessionListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [savedProjects, setSavedProjects] = useState<SavedProjectRow[]>([]);
  const [savedProjectsLoading, setSavedProjectsLoading] = useState(false);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [tokenSnap, setTokenSnap] = useState<MenuProfileTokens | null>(null);
  const [tokenLoad, setTokenLoad] = useState<"ready" | "loading" | "unauthorized" | "error">("loading");

  const numberLocale = lang === "en" ? "en-US" : lang === "tg" ? "tg-TJ" : "ru-RU";

  const loadProfileTokens = useCallback(async () => {
    setTokenLoad("loading");
    try {
      const res = await fetch("/api/profile", { credentials: "include" });
      if (res.status === 401) {
        setTokenSnap(null);
        setTokenLoad("unauthorized");
        return;
      }
      if (!res.ok) {
        setTokenSnap(null);
        setTokenLoad("error");
        return;
      }
      const data = (await res.json()) as { user?: MenuProfileTokens };
      if (data.user) {
        setTokenSnap({
          tokenBalance: data.user.tokenBalance,
          tokenLimit: data.user.tokenLimit,
          tokensUsedToday: data.user.tokensUsedToday
        });
      } else {
        setTokenSnap(null);
      }
      setTokenLoad("ready");
    } catch {
      setTokenSnap(null);
      setTokenLoad("error");
    }
  }, []);

  useEffect(() => {
    void loadProfileTokens();
  }, [loadProfileTokens]);

  useEffect(() => {
    if (open) void loadProfileTokens();
  }, [open, loadProfileTokens]);

  const projectTitleShort = useMemo(() => {
    const value = projectTitle.trim() || t("playground_default_project");
    return value.length > 18 ? `${value.slice(0, 18)}…` : value;
  }, [projectTitle, t]);

  const tokenProgressPct = useMemo(() => {
    if (!tokenSnap || tokenSnap.tokenLimit <= 0) return 0;
    const raw = (tokenSnap.tokenBalance / tokenSnap.tokenLimit) * 100;
    return Math.min(100, Math.max(0, raw));
  }, [tokenSnap]);

  const loadLemnityAiHistory = useCallback(async () => {
    if (!useLemnityAiBridge) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${LEMNITY_AI_BRIDGE_API_PREFIX}/sessions`, { method: "GET", credentials: "include" });
      if (!res.ok) {
        setLemnityAiHistory([]);
        return;
      }
      const data = (await res.json()) as { data?: { sessions?: LemnityAiSessionListItem[] } };
      const sessions = Array.isArray(data.data?.sessions) ? data.data!.sessions! : [];
      setLemnityAiHistory(sessions);
    } catch {
      setLemnityAiHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [useLemnityAiBridge]);

  const loadSavedProjectsForHistory = useCallback(async () => {
    setSavedProjectsLoading(true);
    try {
      const res = await fetch("/api/projects", { credentials: "include" });
      if (!res.ok) {
        setSavedProjects([]);
        return;
      }
      const data = (await res.json()) as { projects?: SavedProjectRow[] };
      const rows = Array.isArray(data.projects) ? data.projects : [];
      setSavedProjects(rows);
    } catch {
      setSavedProjects([]);
    } finally {
      setSavedProjectsLoading(false);
    }
  }, []);

  const refreshHistoryPanel = useCallback(() => {
    try {
      const data = JSON.parse(localStorage.getItem("lemnity.recent") ?? "[]") as Array<{
        t: number;
        text: string;
        templateSlug?: string;
      }>;
      setRecent(data.slice(0, 6));
    } catch {
      setRecent([]);
    }
    void loadSavedProjectsForHistory();
    if (useLemnityAiBridge) void loadLemnityAiHistory();
  }, [useLemnityAiBridge, loadLemnityAiHistory, loadSavedProjectsForHistory]);

  useEffect(() => {
    if (!historyOpen) return;
    refreshHistoryPanel();
  }, [historyOpen, refreshHistoryPanel]);

  const continueWithIdea = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      saveBuilderHandoff(trimmed, undefined, null);
      setHistoryOpen(false);
      if (pathname === "/playground/build") {
        window.location.assign("/playground/build");
        return;
      }
      router.push("/playground/build");
    },
    [pathname, router]
  );

  useEffect(() => {
    function readRecent() {
      try {
        const data = JSON.parse(localStorage.getItem("lemnity.recent") ?? "[]") as Array<{
          t: number;
          text: string;
          templateSlug?: string;
        }>;
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

  const toolbarInline = Boolean(compact && toolbarLayout === "inline");
  const compactTooltipSide = toolbarInline ? ("bottom" as const) : ("right" as const);
  const mainMenuPositionClass = toolbarInline
    ? "left-0 top-full mt-1 max-w-[min(340px,calc(100vw-2rem))]"
    : compact
      ? "left-full top-0 ml-2"
      : "left-0 top-[46px]";
  const historyPanelPositionClass = toolbarInline
    ? "left-0 top-full mt-1 max-w-[min(320px,calc(100vw-2rem))]"
    : compact
      ? "left-full top-[104px] ml-2"
      : "left-[110px] top-[46px]";

  const mainMenuBodyJsx = (
    <>
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
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-zinc-900">{t("playground_menu_tokens_header")}</p>
              <button
                type="button"
                className="flex min-w-0 items-center gap-1 text-sm text-zinc-600 hover:text-zinc-950"
                aria-label={t("playground_menu_tokens_open_profile")}
                onClick={() => {
                  setOpen(false);
                  router.push("/profile");
                }}
              >
                <span className="truncate">
                  {tokenLoad === "loading" ? (
                    t("playground_menu_tokens_loading")
                  ) : tokenLoad === "unauthorized" ? (
                    t("playground_menu_tokens_need_login")
                  ) : tokenSnap ? (
                    <>
                      {tokenSnap.tokenBalance.toLocaleString(numberLocale)}{" "}
                      {t("playground_home_tokens_suffix")}
                    </>
                  ) : (
                    t("playground_home_tokens_none")
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </button>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
              <div
                className="h-2 min-w-0.5 rounded-full bg-blue-500 transition-[width] duration-300"
                style={{ width: `${tokenLoad === "ready" && tokenSnap ? tokenProgressPct : 0}%` }}
              />
            </div>
            {tokenSnap ? (
              <p className="mt-2 text-xs text-zinc-500">
                {t("playground_menu_tokens_used_today")}:{" "}
                {tokenSnap.tokensUsedToday.toLocaleString(numberLocale)}
              </p>
            ) : null}
            {tokenLoad !== "unauthorized" ? (
              <p className={cn("text-xs text-zinc-500", tokenSnap ? "mt-1" : "mt-2")}>
                {t("playground_menu_tokens_allowance_hint")}
              </p>
            ) : null}
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
    </>
  );

  const historyCardJsx = (
          <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-zinc-700">{t("playground_menu_history_header")}</p>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-white hover:text-zinc-900"
                aria-label={t("playground_menu_history_refresh_aria")}
                onClick={() => refreshHistoryPanel()}
              >
                <RefreshCw
                  className={cn(
                    "h-3.5 w-3.5",
                    (savedProjectsLoading || (useLemnityAiBridge && historyLoading)) && "animate-spin"
                  )}
                />
              </button>
            </div>
            <div className="mt-2 space-y-1">
              {useLemnityAiBridge ? (
                historyLoading ? (
                  <p className="text-xs text-zinc-500">{t("playground_menu_tokens_loading")}</p>
                ) : lemnityAiHistory.length ? (
                  lemnityAiHistory.slice(0, 8).map((session) => (
                    <button
                      key={session.session_id}
                      type="button"
                      className="w-full truncate rounded-xl bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                      aria-label={t("playground_menu_history_continue_aria")}
                      onClick={() => {
                        setHistoryOpen(false);
                        router.push(`/playground/build?sessionId=${encodeURIComponent(session.session_id)}`);
                      }}
                    >
                      {session.title?.trim() || session.latest_message?.trim() || session.session_id.slice(0, 12)}
                    </button>
                  ))
                ) : savedProjectsLoading ? (
                  <p className="text-xs text-zinc-500">{t("playground_menu_tokens_loading")}</p>
                ) : savedProjects.length ? (
                  savedProjects.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full truncate rounded-xl bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                      aria-label={t("playground_menu_history_open_project_aria")}
                      onClick={() => {
                        setHistoryOpen(false);
                        router.push(p.editUrl);
                      }}
                    >
                      {p.name?.trim() || p.id.slice(0, 12)}
                    </button>
                  ))
                ) : recent.length ? (
                  <>
                    <p className="text-[11px] leading-snug text-zinc-500">
                      {t("playground_menu_history_recent_coach_caption")}
                    </p>
                    {recent.slice(0, 8).map((r) => (
                      <button
                        key={r.t}
                        type="button"
                        className="flex w-full items-center gap-2 rounded-xl bg-white px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                        aria-label={t("playground_menu_history_recent_coach_aria")}
                        onClick={() => continueWithIdea(r.text)}
                      >
                        <div className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded-lg border border-zinc-100">
                          <BuildTemplateThumbnail
                            slug={r.templateSlug}
                            fallbackSeed={r.text}
                            density="compact"
                            className="absolute inset-0 h-full min-h-0 w-full rounded-none border-0"
                          />
                        </div>
                        <span className="min-w-0 flex-1 truncate">{r.text}</span>
                      </button>
                    ))}
                  </>
                ) : (
                  <p className="text-xs text-zinc-500">{t("playground_menu_no_history")}</p>
                )
              ) : savedProjectsLoading ? (
                <p className="text-xs text-zinc-500">{t("playground_menu_tokens_loading")}</p>
              ) : savedProjects.length ? (
                savedProjects.slice(0, 8).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full truncate rounded-xl bg-white px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                    aria-label={t("playground_menu_history_open_project_aria")}
                    onClick={() => {
                      setHistoryOpen(false);
                      router.push(p.editUrl);
                    }}
                  >
                    {p.name?.trim() || p.id.slice(0, 12)}
                  </button>
                ))
              ) : recent.length ? (
                <>
                  <p className="text-[11px] leading-snug text-zinc-500">
                    {t("playground_menu_history_recent_coach_caption")}
                  </p>
                  {recent.slice(0, 8).map((r) => (
                    <button
                      key={r.t}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-xl bg-white px-2 py-1.5 text-left text-xs text-zinc-700 hover:bg-zinc-50"
                      aria-label={t("playground_menu_history_recent_coach_aria")}
                      onClick={() => continueWithIdea(r.text)}
                    >
                      <div className="relative h-10 w-[72px] shrink-0 overflow-hidden rounded-lg border border-zinc-100">
                        <BuildTemplateThumbnail
                          slug={r.templateSlug}
                          fallbackSeed={r.text}
                          density="compact"
                          className="absolute inset-0 h-full min-h-0 w-full rounded-none border-0"
                        />
                      </div>
                      <span className="min-w-0 flex-1 truncate">{r.text}</span>
                    </button>
                  ))}
                </>
              ) : (
                <p className="text-xs text-zinc-500">{t("playground_menu_no_history")}</p>
              )}
            </div>
          </div>
  );

  if (toolbarInline) {
    return (
      <div className="relative flex shrink-0 flex-row items-center gap-0.5">
        <div className="relative shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>{projectMenuButton}</TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("playground_menu_project_label")} {projectTitleShort}
            </TooltipContent>
          </Tooltip>
          {open ? (
            <div
              className={cn(
                "absolute z-[100] w-[340px] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",
                "left-0 top-full mt-1 max-w-[min(340px,calc(100vw-2rem))]"
              )}
            >
              {mainMenuBodyJsx}
            </div>
          ) : null}
        </div>
        <div className="relative shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>{historyButton}</TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              {t("playground_menu_history_tooltip")}
            </TooltipContent>
          </Tooltip>
          {historyOpen ? (
            <div
              className={cn(
                "absolute z-[100] w-[320px] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",
                "left-0 top-full mt-1 max-w-[min(320px,calc(100vw-2rem))]"
              )}
            >
              {historyCardJsx}
            </div>
          ) : null}
        </div>
        {onToggleCollapse && !hideCollapseButton ? (
          <StudioChatRailCollapseButton
            leftCollapsed={Boolean(leftCollapsed)}
            onToggleCollapse={onToggleCollapse}
            compact={Boolean(compact)}
            tooltipSide="bottom"
          />
        ) : null}
      </div>
    );
  }

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
          <TooltipContent side={compactTooltipSide} align="center">
            {t("playground_menu_project_label")} {projectTitleShort}
          </TooltipContent>
        </Tooltip>
      ) : (
        projectMenuButton
      )}

      {compact ? (
        <Tooltip>
          <TooltipTrigger asChild>{historyButton}</TooltipTrigger>
          <TooltipContent side={compactTooltipSide} align="center">
            {t("playground_menu_history_tooltip")}
          </TooltipContent>
        </Tooltip>
      ) : (
        historyButton
      )}

      {onToggleCollapse && !hideCollapseButton ? (
        <StudioChatRailCollapseButton
          leftCollapsed={Boolean(leftCollapsed)}
          onToggleCollapse={onToggleCollapse}
          compact={Boolean(compact)}
          showTooltip={Boolean(compact)}
          tooltipSide={compactTooltipSide}
        />
      ) : null}

      {open ? (
        <div
          className={cn(
            "absolute z-[100] w-[340px] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",
            mainMenuPositionClass
          )}
        >
          {mainMenuBodyJsx}
        </div>
      ) : null}

      {historyOpen ? (
        <div
          className={cn(
            "absolute z-[100] w-[320px] rounded-3xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",
            historyPanelPositionClass
          )}
        >
          {historyCardJsx}
        </div>
      ) : null}
    </div>
  );
}


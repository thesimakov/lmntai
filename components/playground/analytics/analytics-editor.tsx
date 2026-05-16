"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  MessageSquare,
  TrendingUp,
  LineChart,
  BarChart2,
  RefreshCw,
  Upload,
  Bot,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { useI18n } from "@/components/i18n-provider";
import { AnalyticsUploadZone } from "./analytics-upload-zone";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsChatPanel } from "./analytics-chat-panel";
import { AnalyticsProgressOverlay } from "./analytics-progress-overlay";
import { AnalyticsExportMenu } from "./analytics-export-menu";
import { AnalyticsInvestorPanel } from "./analytics-investor-panel";
import dynamic from "next/dynamic";
const AnalyticsForecastPanel = dynamic(
  () => import("./analytics-forecast-panel").then((m) => ({ default: m.AnalyticsForecastPanel })),
  { ssr: false, loading: () => <div className="p-4 text-xs text-muted-foreground">Загрузка…</div> }
);
import { AnalyticsAgentsPanel } from "./analytics-agents-panel";
import { AnalyticsBenchmarkPanel } from "./analytics-benchmark-panel";
import { cn } from "@/lib/utils";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

type LeftTab = "chat" | "investor" | "forecast" | "agents" | "benchmark";

export function AnalyticsEditor() {
  const { t } = useI18n();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const dashboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("chat");

  const {
    status,
    progress,
    dashboard,
    errorMessage,
    setProjectId,
    setDashboard,
    setStatus,
    setProgress,
    setError,
  } = useAnalyticsStore();

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);

    fetch(`/api/analytics/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { dashboard?: AnalysisDashboard; data?: { dashboard?: AnalysisDashboard } } | null) => {
        const resolvedDashboard = data?.dashboard ?? data?.data?.dashboard;
        if (resolvedDashboard) {
          setDashboard(resolvedDashboard);
        }
      })
      .catch(() => {});
  }, [projectId, setProjectId, setDashboard]);

  const runAnalysis = useCallback(async () => {
    setStatus("analyzing");
    setProgress(10);

    try {
      const analyzeRes = await fetch(`/api/analytics/${projectId}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.ok || !analyzeRes.body) {
        const err = await analyzeRes.json().catch(() => ({})) as { error?: string };
        setError(err.error ?? "Analysis failed");
        return;
      }

      const reader = analyzeRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let isDone = false;

      function processSseLine(line: string): boolean {
        if (!line.startsWith("data: ")) return false;
        try {
          const payload = JSON.parse(line.slice(6)) as {
            type: string;
            progress?: number;
            dashboard?: AnalysisDashboard;
            message?: string;
          };
          if (payload.type === "progress" && payload.progress !== undefined) {
            setProgress(payload.progress);
          } else if (payload.type === "complete" && payload.dashboard) {
            setDashboard(payload.dashboard);
            return true;
          } else if (payload.type === "error") {
            setError(payload.message ?? "Analysis failed");
          }
        } catch { /* ignore malformed SSE frame */ }
        return false;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          if (buf) isDone = processSseLine(buf);
          break;
        }

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (processSseLine(line)) { isDone = true; break; }
        }

        if (isDone) break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unexpected error";
      setError(msg);
      setStatus("idle");
    }
  }, [projectId, setStatus, setProgress, setDashboard, setError]);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setProgress(5);

      try {
        const form = new FormData();
        form.append("file", file);

        const uploadRes = await fetch(`/api/analytics/${projectId}/upload`, {
          method: "POST",
          body: form,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({})) as { error?: string };
          setError(err.error ?? "Upload failed");
          return;
        }

        await runAnalysis();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unexpected error";
        setError(msg);
        setStatus("idle");
      }
    },
    [projectId, setStatus, setProgress, setError, runAnalysis]
  );

  const isLoading = status === "uploading" || status === "analyzing";
  const hasDashboard = Boolean(dashboard);

  const progressMessage =
    status === "uploading"
      ? t("analytics_bi_uploading")
      : t("analytics_bi_analyzing");

  const leftTabs: { id: LeftTab; Icon: typeof MessageSquare; labelKey: Parameters<typeof t>[0] }[] = [
    { id: "chat", Icon: MessageSquare, labelKey: "analytics_bi_tab_chat" },
    { id: "investor", Icon: TrendingUp, labelKey: "analytics_bi_tab_investor" },
    { id: "forecast", Icon: LineChart, labelKey: "analytics_bi_tab_forecast" },
    { id: "agents", Icon: Bot, labelKey: "analytics_bi_tab_agents" },
    { id: "benchmark", Icon: Target, labelKey: "analytics_bi_tab_benchmark" },
  ];

  return (
    <div className="flex flex-col w-full h-full">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-5 h-12 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart2 className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {t("nav_analytics_bi")}
          </span>
          {hasDashboard && dashboard?.meta?.companyName && (
            <>
              <span className="text-muted-foreground/40 mx-0.5 text-sm">/</span>
              <span className="text-sm text-muted-foreground truncate max-w-[200px]">
                {dashboard.meta.companyName}
              </span>
            </>
          )}
        </div>

        {hasDashboard && (
          <>
            <div className="w-px h-4 bg-border mx-1 shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-8 px-2.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="w-3.5 h-3.5" />
              {t("analytics_bi_reupload")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.xlsx,.xls,text/csv,application/json"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-8 px-2.5 text-xs"
              onClick={() => void runAnalysis()}
              disabled={isLoading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
              {t("analytics_bi_reanalyze")}
            </Button>
            <div className="w-px h-4 bg-border mx-1 shrink-0 hidden md:block" />
            <Button
              variant={leftTab === "investor" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 px-2.5 text-xs hidden md:flex"
              onClick={() => setLeftTab("investor")}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              {t("analytics_bi_investor_deck")}
            </Button>
            <Button
              variant={leftTab === "forecast" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 px-2.5 text-xs hidden md:flex"
              onClick={() => setLeftTab("forecast")}
            >
              <LineChart className="w-3.5 h-3.5" />
              {t("analytics_bi_forecast")}
            </Button>
            <Button
              variant={leftTab === "agents" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 px-2.5 text-xs hidden md:flex"
              onClick={() => setLeftTab("agents")}
            >
              <Bot className="w-3.5 h-3.5" />
              {t("analytics_bi_ai_agents")}
            </Button>
            <Button
              variant={leftTab === "benchmark" ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5 h-8 px-2.5 text-xs hidden md:flex"
              onClick={() => setLeftTab("benchmark")}
            >
              <Target className="w-3.5 h-3.5" />
              {t("analytics_bi_benchmarks")}
            </Button>
          </>
        )}

        <div className="flex-1" />
        <AnalyticsExportMenu projectId={projectId} dashboardRef={dashboardRef} />
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {isLoading && (
          <AnalyticsProgressOverlay progress={progress} message={progressMessage} />
        )}

        {!hasDashboard && (status === "idle" || status === "error") ? (
          /* ── Empty / upload state ── */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 bg-[#FAFAFA]">
            <div className="flex flex-col items-center gap-3 text-center max-w-sm">
              <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shadow-sm">
                <BarChart2 className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-foreground">
                  {t("analytics_bi_empty_title")}
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                  {t("analytics_bi_empty_desc")}
                </p>
              </div>
            </div>
            <AnalyticsUploadZone onFile={(f) => void handleFile(f)} disabled={isLoading} />
            {status === "error" && errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </div>
        ) : hasDashboard ? (
          /* ── Two-column workspace ── */
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="w-60 shrink-0 flex flex-col border-r border-border overflow-hidden bg-white">
              <div className="flex shrink-0 border-b border-border">
                {leftTabs.map(({ id, Icon, labelKey }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLeftTab(id)}
                    title={t(labelKey)}
                    className={cn(
                      "flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors leading-none",
                      leftTab === id
                        ? "text-foreground border-b-2 border-foreground -mb-px bg-white"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t(labelKey)}</span>
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto">
                {leftTab === "chat" ? (
                  <AnalyticsChatPanel projectId={projectId} />
                ) : leftTab === "investor" ? (
                  <AnalyticsInvestorPanel projectId={projectId} />
                ) : leftTab === "forecast" ? (
                  <AnalyticsForecastPanel projectId={projectId} />
                ) : leftTab === "agents" ? (
                  <AnalyticsAgentsPanel projectId={projectId} />
                ) : (
                  <AnalyticsBenchmarkPanel projectId={projectId} />
                )}
              </div>
            </div>

            {/* Main dashboard area */}
            <div ref={dashboardRef} className="flex-1 overflow-auto bg-[#FAFAFA]">
              <AnalyticsDashboard dashboard={dashboard!} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

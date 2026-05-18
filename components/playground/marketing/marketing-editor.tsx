"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, MessageSquare, RefreshCw, TrendingUp, Loader2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";
import { MarketingUploadPanel } from "./marketing-upload-panel";
import { MarketingChatPanel } from "./marketing-chat-panel";
import { MarketingDashboard } from "./marketing-dashboard";
import { MarketingChatInsight } from "./marketing-chat-insight";
import type { MarketingDashboard as MarketingDashboardType } from "@/lib/marketing-schema";
import type { UiLanguage } from "@/lib/i18n";
import type { MarketingChatMessage } from "@/lib/stores/use-marketing-store";

type LeftTab = "upload" | "chat";

function ExportButton({
  report,
  chatMessages,
  lang,
  label,
}: {
  report: MarketingDashboardType;
  chatMessages: MarketingChatMessage[];
  lang: UiLanguage;
  label: string;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { downloadMarketingPdf } = await import("@/lib/marketing-pdf-export");
      const base = report.meta.companyName.replace(/\s+/g, "_");
      const period = report.meta.period.replace(/\s+/g, "_");
      const filename = `${base}_${period}_Marketing.pdf`;
      const messages = chatMessages
        .filter((m) => m.content.trim())
        .map((m) => ({ role: m.role, content: m.content }));
      await downloadMarketingPdf(report, messages, lang, filename);
    } catch {
      toast.error(t("marketing_bi_export_error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-1.5 h-8 text-xs"
      disabled={busy}
      onClick={() => void handleExport()}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
      {label}
    </Button>
  );
}

export function MarketingEditor() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const campaignGoal = searchParams.get("goal")?.trim() ?? "";
  const campaignChannels = searchParams.get("channel")?.trim() ?? "";
  const [leftTab, setLeftTab] = useState<LeftTab>("upload");
  const chatInsightAnchorRef = useRef<HTMLDivElement>(null);

  const {
    status,
    dashboard,
    errorMessage,
    chatMessages,
    isChatStreaming,
    setProjectId,
    setDashboard,
    setStatus,
    setError,
  } = useMarketingStore();

  const lastAssistantMessage = [...chatMessages].reverse().find((m) => m.role === "assistant");
  const lastUserMessage = [...chatMessages].reverse().find((m) => m.role === "user");
  const chatInsightContent = lastAssistantMessage?.content ?? "";
  const showChatInsight = Boolean(chatInsightContent.trim()) || isChatStreaming;

  useEffect(() => {
    if (!showChatInsight) return;
    chatInsightAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showChatInsight, chatInsightContent, isChatStreaming]);

  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);
    fetch(`/api/marketing/${projectId}?lang=${encodeURIComponent(lang)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { report?: MarketingDashboardType } | null) => {
        if (data?.report) {
          setDashboard(data.report);
        }
      })
      .catch(() => {});
  }, [lang, projectId, setProjectId, setDashboard]);

  const handleAnalyze = useCallback(async () => {
    if (!projectId) return;
    setStatus("analyzing");
    try {
      const res = await fetch(`/api/marketing/${projectId}/analyze?lang=${encodeURIComponent(lang)}`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "Analysis failed");
        return;
      }
      const data = (await res.json()) as { report?: MarketingDashboardType };
      if (data?.report) {
        setDashboard(data.report);
      } else {
        setError("No report returned from analysis");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }, [lang, projectId, setStatus, setError, setDashboard]);

  const isUploading = status === "uploading";
  const isAnalyzing = status === "analyzing";
  const hasDashboard = dashboard !== null;
  const isEmptyState = (status === "idle" || status === "error") && !hasDashboard;

  const leftTabs: { id: LeftTab; Icon: typeof Upload; labelKey: Parameters<typeof t>[0] }[] = [
    { id: "upload", Icon: Upload, labelKey: "marketing_bi_tab_upload" },
    { id: "chat", Icon: MessageSquare, labelKey: "marketing_bi_tab_chat" },
  ];

  return (
    <div className="flex flex-col w-full h-full">
      {/* ── Top bar ── */}
      <header className="flex items-center gap-3 px-5 h-12 border-b border-border bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-sm font-medium text-foreground">
            {t("nav_marketing_bi")}
          </span>
        </div>

        {hasDashboard && (
          <>
            <div className="w-px h-4 bg-border mx-1 shrink-0" />
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground h-8 px-2.5 text-xs"
              onClick={() => void handleAnalyze()}
              disabled={isAnalyzing || isUploading}
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isAnalyzing && "animate-spin")} />
              {t("marketing_bi_reanalyze")}
            </Button>
          </>
        )}

        <div className="flex-1" />

        {hasDashboard && dashboard && (
          <ExportButton
            report={dashboard}
            chatMessages={chatMessages}
            lang={lang}
            label={t("marketing_bi_export_pdf")}
          />
        )}
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Analyzing overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-7 h-7 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">{t("marketing_bi_analyzing")}</p>
            </div>
          </div>
        )}

        {isEmptyState ? (
          /* ── Empty state ── */
          <div className="flex flex-1 bg-[#FAFAFA]">
            <div className="w-60 shrink-0 border-r border-border flex flex-col bg-white">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {t("marketing_bi_tab_upload")}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MarketingUploadPanel
                  onAnalyze={handleAnalyze}
                  isUploading={isUploading}
                  isAnalyzing={isAnalyzing}
                  projectId={projectId}
                />
              </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
              <div className="w-10 h-10 rounded-xl border border-border bg-white flex items-center justify-center shadow-sm">
                <TrendingUp className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t("nav_marketing_bi")}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {status === "error" && errorMessage ? errorMessage : t("marketing_bi_empty_hint")}
                </p>
                {(campaignGoal || campaignChannels) && status !== "error" ? (
                  <dl className="mx-auto mt-4 max-w-sm space-y-2 text-left text-xs text-muted-foreground">
                    {campaignGoal ? (
                      <div>
                        <dt className="font-medium text-foreground/80">Цель кампании</dt>
                        <dd className="mt-0.5">{campaignGoal}</dd>
                      </div>
                    ) : null}
                    {campaignChannels ? (
                      <div>
                        <dt className="font-medium text-foreground/80">Каналы</dt>
                        <dd className="mt-0.5">{campaignChannels}</dd>
                      </div>
                    ) : null}
                  </dl>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          /* ── Ready — two-column layout ── */
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="w-60 shrink-0 flex flex-col border-r border-border overflow-hidden bg-white">
              <div className="flex shrink-0 border-b border-border">
                {leftTabs.map(({ id, Icon, labelKey }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLeftTab(id)}
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
                {leftTab === "upload" ? (
                  <MarketingUploadPanel
                    onAnalyze={handleAnalyze}
                    isUploading={isUploading}
                    isAnalyzing={isAnalyzing}
                    projectId={projectId}
                  />
                ) : (
                  <MarketingChatPanel projectId={projectId} />
                )}
              </div>
            </div>

            {/* Dashboard */}
            <div className="flex-1 overflow-hidden flex flex-col bg-[#FAFAFA]">
              {status === "error" && errorMessage && (
                <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 text-sm text-destructive shrink-0">
                  {errorMessage}
                </div>
              )}
              <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-4">
                {dashboard ? <MarketingDashboard dashboard={dashboard} /> : null}
                {showChatInsight ? (
                  <div ref={chatInsightAnchorRef}>
                    <MarketingChatInsight
                      content={chatInsightContent}
                      isStreaming={isChatStreaming}
                      userQuestion={lastUserMessage?.content}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

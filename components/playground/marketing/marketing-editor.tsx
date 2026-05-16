"use client";

import { useEffect, useCallback, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, MessageSquare, RefreshCw, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";
import { MarketingUploadPanel } from "./marketing-upload-panel";
import { MarketingChatPanel } from "./marketing-chat-panel";
import { MarketingDashboard } from "./marketing-dashboard";
import type { MarketingDashboard as MarketingDashboardType } from "@/lib/marketing-schema";

type LeftTab = "upload" | "chat";

function ExportButton({ projectId, label, lang }: { projectId: string; label: string; lang: string }) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (!projectId || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/marketing/${projectId}/export?lang=${encodeURIComponent(lang)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "marketing-pptx" }),
      });

      if (!res.ok) {
        let message = t("marketing_bi_export_error");
        const ct = res.headers.get("content-type") ?? "";
        if (ct.includes("application/json")) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          if (data?.error) message = data.error;
        }
        toast.error(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      try {
        const cd = res.headers.get("Content-Disposition");
        const m = cd?.match(/filename="([^"]+)"/);
        const filename = m?.[1] ?? "marketing.pptx";

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.rel = "noopener";
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } finally {
        URL.revokeObjectURL(url);
      }
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
      disabled={busy || !projectId}
      onClick={() => void handleExport()}
    >
      {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
      {label}
    </Button>
  );
}

export function MarketingEditor() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId") ?? "";
  const [leftTab, setLeftTab] = useState<LeftTab>("upload");

  const {
    status,
    dashboard,
    errorMessage,
    setProjectId,
    setDashboard,
    setStatus,
    setError,
  } = useMarketingStore();

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

        {hasDashboard && (
          <ExportButton projectId={projectId} label={t("marketing_bi_export_pptx")} lang={lang} />
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
              {dashboard && <MarketingDashboard dashboard={dashboard} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

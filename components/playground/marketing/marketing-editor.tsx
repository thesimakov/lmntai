"use client";

import { useEffect, useCallback, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Upload, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMarketingStore } from "@/lib/stores/use-marketing-store";
import { MarketingUploadPanel } from "./marketing-upload-panel";
import { MarketingChatPanel } from "./marketing-chat-panel";
import { MarketingDashboard } from "./marketing-dashboard";
import type { MarketingDashboard as MarketingDashboardType } from "@/lib/marketing-schema";

type LeftTab = "upload" | "chat";

function ExportButton({ projectId }: { projectId: string }) {
  const handleExport = async () => {
    const res = await fetch(`/api/marketing/${projectId}/export`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ format: "marketing-pptx" }),
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "marketing.pptx";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={() => void handleExport()}>
      ↓ Export PPTX
    </Button>
  );
}

export function MarketingEditor() {
  const router = useRouter();
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
    fetch(`/api/marketing/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: { report?: MarketingDashboardType } } | null) => {
        if (data?.data?.report) {
          setDashboard(data.data.report);
        }
      })
      .catch(() => {});
  }, [projectId, setProjectId, setDashboard]);

  const handleAnalyze = useCallback(async () => {
    if (!projectId) return;
    setStatus("analyzing");
    try {
      const res = await fetch(`/api/marketing/${projectId}/analyze`, { method: "POST" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setError(err.error ?? "Analysis failed");
        return;
      }
      const data = (await res.json()) as { data?: { report?: MarketingDashboardType } };
      if (data?.data?.report) {
        setDashboard(data.data.report);
      } else {
        setError("No report returned from analysis");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    }
  }, [projectId, setStatus, setError, setDashboard]);

  const isUploading = status === "uploading";
  const isAnalyzing = status === "analyzing";
  const isEmptyState = (status === "idle" || status === "error") && dashboard === null;

  return (
    <div className="flex flex-col w-full h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 h-12 border-b bg-card shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          onClick={() => router.push("/")}
        >
          <ArrowLeft className="w-4 h-4" />
          Projects
        </Button>
        <div className="flex-1" />
        {status === "ready" && <ExportButton projectId={projectId} />}
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Analyzing overlay */}
        {status === "analyzing" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing marketing data...</p>
            </div>
          </div>
        )}

        {isEmptyState ? (
          /* Empty/upload state — left panel with upload tab only */
          <div className="flex flex-1">
            <div className="w-64 shrink-0 border-r flex flex-col">
              <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground uppercase">
                Upload
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
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {status === "error" && errorMessage
                ? errorMessage
                : "Upload marketing data and click Analyze"}
            </div>
          </div>
        ) : (
          /* Ready state — 2-tab left panel + dashboard */
          <div className="flex flex-1 overflow-hidden">
            {/* Left panel */}
            <div className="w-64 shrink-0 flex flex-col border-r overflow-hidden">
              <div className="flex shrink-0 border-b">
                <button
                  type="button"
                  onClick={() => setLeftTab("upload")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                    leftTab === "upload"
                      ? "text-foreground border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("chat")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                    leftTab === "chat"
                      ? "text-foreground border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Chat
                </button>
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
            <div className="flex-1 overflow-hidden flex flex-col">
              {status === "error" && errorMessage && (
                <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-sm text-red-500 shrink-0">
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

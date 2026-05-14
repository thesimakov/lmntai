"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { AnalyticsUploadZone } from "./analytics-upload-zone";
import { AnalyticsDashboard } from "./analytics-dashboard";
import { AnalyticsChatPanel } from "./analytics-chat-panel";
import { AnalyticsProgressOverlay } from "./analytics-progress-overlay";
import { AnalyticsExportMenu } from "./analytics-export-menu";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

export function AnalyticsEditor() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectId = searchParams.get("projectId") ?? "";
  const dashboardRef = useRef<HTMLDivElement>(null);

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

  // Load existing analysis on mount
  useEffect(() => {
    if (!projectId) return;
    setProjectId(projectId);

    fetch(`/api/analytics/${projectId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { data?: { dashboard?: AnalysisDashboard } } | null) => {
        if (data?.data?.dashboard) {
          setDashboard(data.data.dashboard);
        }
      })
      .catch(() => {});
  }, [projectId, setProjectId, setDashboard]);

  const handleFile = useCallback(
    async (file: File) => {
      setStatus("uploading");
      setProgress(5);

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

      setStatus("analyzing");
      setProgress(10);

      const analyzeRes = await fetch(`/api/analytics/${projectId}/analyze`, {
        method: "POST",
      });

      if (!analyzeRes.body) {
        setError("Analysis stream unavailable");
        return;
      }

      const reader = analyzeRes.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
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
          } else if (payload.type === "error") {
            setError(payload.message ?? "Analysis failed");
          }
        }
      }
    },
    [projectId, setStatus, setProgress, setDashboard, setError]
  );

  const isLoading = status === "uploading" || status === "analyzing";
  const progressMessage =
    status === "uploading" ? "Uploading PDF..." : "Analyzing financial data...";

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
        <AnalyticsExportMenu projectId={projectId} dashboardRef={dashboardRef} />
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {isLoading && (
          <AnalyticsProgressOverlay progress={progress} message={progressMessage} />
        )}

        {(status === "idle" || status === "error") ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-muted-foreground text-sm max-w-sm text-center">
              Upload a financial PDF — P&amp;L, balance sheet, cash flow report — and get an instant AI analysis.
            </p>
            <AnalyticsUploadZone onFile={(f) => void handleFile(f)} disabled={isLoading} />
            {status === "error" && errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Left: chat */}
            <div className="w-64 shrink-0 overflow-hidden">
              <AnalyticsChatPanel projectId={projectId} />
            </div>

            {/* Center: dashboard */}
            <div ref={dashboardRef} className="flex-1 overflow-hidden">
              {dashboard && <AnalyticsDashboard dashboard={dashboard} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

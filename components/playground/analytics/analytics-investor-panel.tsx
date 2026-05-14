"use client";

import { useState, useCallback } from "react";
import { TrendingUp, Loader2, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
}

const FORMAT_CARDS = [
  {
    id: "investor-vc-pptx" as const,
    label: "VC Pitch",
    description: "10 slides · Fundraising",
    color: "text-blue-400",
    borderColor: "border-blue-500/30",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "investor-board-pptx" as const,
    label: "Board Report",
    description: "14 slides · CFO & Board",
    color: "text-green-400",
    borderColor: "border-green-500/30",
    bgColor: "bg-green-500/10",
  },
  {
    id: "investor-dd-pptx" as const,
    label: "Due Diligence",
    description: "8 slides · Investors",
    color: "text-amber-400",
    borderColor: "border-amber-500/30",
    bgColor: "bg-amber-500/10",
  },
];

function riskColor(score: number) {
  if (score < 40) return "text-green-400";
  if (score < 70) return "text-amber-400";
  return "text-red-400";
}

function riskBg(score: number) {
  if (score < 40) return "bg-green-500/10 border-green-500/30";
  if (score < 70) return "bg-amber-500/10 border-amber-500/30";
  return "bg-red-500/10 border-red-500/30";
}

async function downloadPptx(projectId: string, format: string, label: string) {
  const res = await fetch(`/api/analytics/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(err.error ?? "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label}.pptx`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsInvestorPanel({ projectId }: Props) {
  const {
    dashboard,
    investorReport,
    investorStatus,
    investorError,
    setInvestorReport,
    setInvestorStatus,
    setInvestorError,
  } = useAnalyticsStore();

  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setInvestorError("");
    setInvestorStatus("generating");
    setDownloadError(null);
    try {
      const res = await fetch(`/api/analytics/${projectId}/investor`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        setInvestorError(err.error ?? "Generation failed");
        return;
      }
      const data = await res.json() as { data?: { report?: unknown } };
      const { investorReportSchema } = await import("@/lib/investor-schema");
      const parsed = investorReportSchema.safeParse(data.data?.report);
      if (!parsed.success) {
        setInvestorError("Invalid response from server");
        return;
      }
      setInvestorReport(parsed.data);
    } catch (err) {
      setInvestorError(err instanceof Error ? err.message : "Generation failed");
    }
  }, [projectId, setInvestorReport, setInvestorStatus, setInvestorError]);

  const handleDownload = useCallback(
    async (format: string, label: string) => {
      setDownloadingFormat(format);
      setDownloadError(null);
      try {
        await downloadPptx(projectId, format, label);
      } catch (err) {
        setDownloadError(err instanceof Error ? err.message : "Download failed");
      } finally {
        setDownloadingFormat(null);
      }
    },
    [projectId]
  );

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          Upload and analyze a PDF first to generate investor materials.
        </p>
      </div>
    );
  }

  if (investorStatus === "idle" || investorStatus === "error") {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Generate investor-ready reports from your financial analysis.
        </p>

        <div className="flex flex-col gap-2">
          {FORMAT_CARDS.map((card) => (
            <div
              key={card.id}
              className={cn("rounded-md border p-3", card.bgColor, card.borderColor)}
            >
              <p className={cn("text-xs font-semibold", card.color)}>{card.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.description}</p>
            </div>
          ))}
        </div>

        {investorStatus === "error" && investorError && (
          <p className="text-xs text-red-500">{investorError}</p>
        )}

        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => void handleGenerate()}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          Generate Investor Report
        </Button>
      </div>
    );
  }

  if (investorStatus === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground text-center">
          Generating investor reports…
          <br />
          This may take 30–60 seconds.
        </p>
      </div>
    );
  }

  // ready
  const report = investorReport!;
  const riskCls = riskColor(report.riskScore);
  const riskBgCls = riskBg(report.riskScore);

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Risk score */}
      <div className={cn("rounded-md border p-3", riskBgCls)}>
        <p className="text-[11px] text-muted-foreground mb-1">Investment Risk Score</p>
        <div className="flex items-baseline gap-2">
          <span className={cn("text-2xl font-bold", riskCls)}>{report.riskScore}</span>
          <span className="text-xs text-muted-foreground">/100 · {report.riskLabel}</span>
        </div>
      </div>

      {/* Forecast preview */}
      <div className="rounded-md border border-border p-3 text-xs">
        <p className="text-[11px] font-medium text-foreground mb-1.5">12M Forecast</p>
        <div className="flex flex-col gap-1">
          {(["optimistic", "base", "pessimistic"] as const).map((key) => {
            const s = report.forecast.scenarios[key];
            const color = key === "optimistic" ? "text-green-400" : key === "pessimistic" ? "text-red-400" : "text-muted-foreground";
            return (
              <div key={key} className="flex items-center justify-between">
                <span className={cn("capitalize", color)}>{key}</span>
                <span className="text-muted-foreground">{s.revenue}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download buttons */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] text-muted-foreground font-medium">Download PPTX</p>
        {FORMAT_CARDS.map((card) => (
          <Button
            key={card.id}
            variant="outline"
            size="sm"
            className="w-full justify-between text-xs h-8"
            disabled={downloadingFormat === card.id}
            onClick={() => void handleDownload(card.id, card.label)}
          >
            <span>{card.label}</span>
            {downloadingFormat === card.id ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3 text-muted-foreground" />
            )}
          </Button>
        ))}
        {downloadError && (
          <p className="text-xs text-red-500 mt-1">{downloadError}</p>
        )}
      </div>

      {/* Regenerate */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full gap-1.5 text-xs text-muted-foreground"
        onClick={() => void handleGenerate()}
      >
        <ChevronRight className="w-3 h-3" />
        Regenerate
      </Button>
    </div>
  );
}

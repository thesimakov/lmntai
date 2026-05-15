"use client";

import { useState, useCallback } from "react";
import { Target, Loader2, Play, TrendingUp, TrendingDown, Minus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BenchmarkReport } from "@/app/api/analytics/[id]/benchmark/route";
import type { BenchmarkComparison } from "@/lib/analytics-benchmarks";

interface AnalyticsBenchmarkPanelProps {
  projectId: string;
}

const STATUS_CONFIG = {
  above: { icon: TrendingUp, color: "text-green-500", label: "Above median" },
  below: { icon: TrendingDown, color: "text-red-500", label: "Below median" },
  "on-par": { icon: Minus, color: "text-yellow-500", label: "On par" },
  unknown: { icon: Minus, color: "text-muted-foreground", label: "No data" },
} satisfies Record<BenchmarkComparison["status"], { icon: React.ComponentType<{ className?: string }>; color: string; label: string }>;

function BenchmarkBar({ comparison }: { comparison: BenchmarkComparison }) {
  const { icon: Icon, color, label } = STATUS_CONFIG[comparison.status];
  const { median, p25, p75, unit } = comparison;

  const range = p75 - p25;
  const companyPct =
    comparison.companyValue !== null && range > 0
      ? Math.max(0, Math.min(100, ((comparison.companyValue - p25) / range) * 100))
      : null;
  const medianPct = range > 0 ? ((median - p25) / range) * 100 : 50;

  const fmt = (n: number) =>
    unit === "%" || unit === "score"
      ? `${n}%`
      : unit === "x"
      ? `${n}x`
      : `${n}mo`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium truncate max-w-[120px]" title={comparison.label}>
          {comparison.label}
        </span>
        <div className={cn("flex items-center gap-1", color)}>
          <Icon className="w-3 h-3" />
          <span className="text-xs">{label}</span>
        </div>
      </div>

      {/* Bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-visible">
        {/* p25–p75 band */}
        <div className="absolute inset-y-0 rounded-full bg-primary/20" style={{ left: "0%", right: "0%" }} />
        {/* Median tick */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary/60 rounded-full"
          style={{ left: `${medianPct}%` }}
        />
        {/* Company dot */}
        {companyPct !== null && (
          <div
            className={cn("absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-background shadow-sm", color.replace("text-", "bg-"))}
            style={{ left: `${companyPct}%`, transform: "translate(-50%, -50%)" }}
          />
        )}
      </div>

      {/* Labels */}
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>P25: {fmt(p25)}</span>
        <span>Median: {fmt(median)}</span>
        <span>P75: {fmt(p75)}</span>
      </div>

      {comparison.companyValue !== null && (
        <p className="text-[10px] text-muted-foreground">
          Your value: <span className={cn("font-medium", color)}>{fmt(comparison.companyValue)}</span>
        </p>
      )}
    </div>
  );
}

export function AnalyticsBenchmarkPanel({ projectId }: AnalyticsBenchmarkPanelProps) {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runBenchmark = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${projectId}/benchmark`, { method: "POST" });
      const data = await res.json() as { data?: { report: BenchmarkReport }; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Benchmark failed");
      } else if (data.data?.report) {
        setReport(data.data.report);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setRunning(false);
    }
  }, [projectId]);

  if (!report && !running && !error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <div className="p-2.5 rounded-full bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium">Industry Benchmarks</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Compare your KPIs against industry medians. We auto-detect your sector from the analysis.
        </p>
        <Button size="sm" className="gap-1.5 mt-1" onClick={() => void runBenchmark()}>
          <Play className="w-3.5 h-3.5" />
          Run Benchmark
        </Button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 h-full">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm font-medium">Benchmarking against industry data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <XCircle className="w-6 h-6 text-red-500" />
        <p className="text-sm text-red-500">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void runBenchmark()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <div>
          <p className="text-xs font-medium">{report!.industry.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {new Date(report!.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            {report!.sampleCount != null && report!.sampleCount > 0 && (
              <span className="ml-1 text-green-600">· {report!.sampleCount} real samples</span>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-xs gap-1"
          onClick={() => void runBenchmark()}
          disabled={running}
        >
          <Play className="w-3 h-3" />
          Re-run
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Metric comparisons */}
        <div className="p-3 space-y-4 border-b border-border">
          {report!.comparisons.map((c) => (
            <BenchmarkBar key={c.label} comparison={c} />
          ))}
        </div>

        {/* AI narrative */}
        {report!.narrative && (
          <div className="p-3">
            <p className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Assessment</p>
            <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {report!.narrative}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useCallback, useRef } from "react";
import { Target, Loader2, Play, TrendingUp, TrendingDown, Minus, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import type { BenchmarkReport } from "@/app/api/analytics/[id]/benchmark/route";
import type { BenchmarkComparison } from "@/lib/analytics-benchmarks";

interface AnalyticsBenchmarkPanelProps {
  projectId: string;
}

const STATUS_STYLES = {
  above: { icon: TrendingUp, color: "text-green-500" },
  below: { icon: TrendingDown, color: "text-red-500" },
  "on-par": { icon: Minus, color: "text-yellow-500" },
  unknown: { icon: Minus, color: "text-muted-foreground" },
} satisfies Record<BenchmarkComparison["status"], { icon: React.ComponentType<{ className?: string }>; color: string }>;

function BenchmarkBar({
  comparison,
  statusLabel,
  yourValueLabel,
  medianLabel,
  monthSuffix,
}: {
  comparison: BenchmarkComparison;
  statusLabel: string;
  yourValueLabel: string;
  medianLabel: string;
  monthSuffix: string;
}) {
  const { icon: Icon, color } = STATUS_STYLES[comparison.status];
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
      : `${n}${monthSuffix}`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-base font-medium truncate max-w-[200px]" title={comparison.label}>
          {comparison.label}
        </span>
        <div className={cn("flex items-center gap-1 shrink-0", color)}>
          <Icon className="w-4 h-4" />
          <span className="text-base">{statusLabel}</span>
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
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>P25: {fmt(p25)}</span>
        <span>{medianLabel}: {fmt(median)}</span>
        <span>P75: {fmt(p75)}</span>
      </div>

      {comparison.companyValue !== null && (
        <p className="text-base text-muted-foreground">
          {yourValueLabel} <span className={cn("font-medium", color)}>{fmt(comparison.companyValue)}</span>
        </p>
      )}
    </div>
  );
}

export function AnalyticsBenchmarkPanel({ projectId }: AnalyticsBenchmarkPanelProps) {
  const { t, lang } = useI18n();
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const statusLabels: Record<BenchmarkComparison["status"], string> = {
    above: t("analytics_bi_benchmark_above"),
    below: t("analytics_bi_benchmark_below"),
    "on-par": t("analytics_bi_benchmark_on_par"),
    unknown: t("analytics_bi_benchmark_no_data"),
  };

  const medianLabel = lang === "en" ? "Median" : lang === "tg" ? "Медиана" : "Медиана";
  const monthSuffix = lang === "en" ? "mo" : lang === "tg" ? " моҳ" : " мес";

  const runBenchmark = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/${projectId}/benchmark?lang=${encodeURIComponent(lang)}`, {
        method: "POST",
        signal: controller.signal,
      });
      const data = await res.json() as { report?: BenchmarkReport; data?: { report?: BenchmarkReport }; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Benchmark failed");
      } else if (data.report ?? data.data?.report) {
        setReport((data.report ?? data.data?.report) as BenchmarkReport);
      } else {
        setError("Invalid response from server");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (err instanceof Error && err.message.trim().toLowerCase() === "failed to fetch") {
        setError("Сервер временно недоступен. Проверьте соединение и попробуйте снова.");
        return;
      }
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setRunning(false);
    }
  }, [lang, projectId]);

  if (!report && !running && !error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <div className="p-2.5 rounded-full bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <p className="text-sm font-medium">{t("analytics_bi_benchmark_title")}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t("analytics_bi_benchmark_desc")}
        </p>
        <Button size="sm" className="gap-1.5 mt-1" onClick={() => void runBenchmark()}>
          <Play className="w-3.5 h-3.5" />
          {t("analytics_bi_benchmark_run")}
        </Button>
      </div>
    );
  }

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 h-full">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
        <p className="text-sm font-medium">{t("analytics_bi_benchmark_running")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center h-full">
        <XCircle className="w-6 h-6 text-red-500" />
        <p className="text-sm text-red-500">{error}</p>
        <Button size="sm" variant="outline" onClick={() => void runBenchmark()}>
          {t("analytics_bi_benchmark_retry")}
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
              <span className="ml-1 text-green-600">· {report!.sampleCount} {t("analytics_bi_benchmark_samples")}</span>
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
          {t("analytics_bi_benchmark_rerun")}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Metric comparisons */}
        <div className="p-3 space-y-4 border-b border-border">
          {report!.comparisons.map((c) => (
            <BenchmarkBar
              key={c.label}
              comparison={c}
              statusLabel={statusLabels[c.status]}
              yourValueLabel={t("analytics_bi_benchmark_your_value")}
              medianLabel={medianLabel}
              monthSuffix={monthSuffix}
            />
          ))}
        </div>

        {/* AI narrative */}
        {report!.narrative && (
          <div className="p-3">
            <p className="text-base font-semibold mb-2 text-muted-foreground uppercase tracking-wide">{t("analytics_bi_benchmark_assessment")}</p>
            <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-wrap">
              {report!.narrative}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

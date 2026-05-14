"use client";

import { useState, useCallback } from "react";
import { LineChart, Loader2, Download, ChevronRight } from "lucide-react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { useAnalyticsStore } from "@/lib/stores/use-analytics-store";
import { forecastReportSchema } from "@/lib/forecast-schema";
import type { ForecastReport, ForecastMetric } from "@/lib/forecast-schema";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
}

const HORIZON_COUNTS = { "6m": 6, "12m": 12, "24m": 24 } as const;
type Horizon = keyof typeof HORIZON_COUNTS;

function buildChartData(metric: ForecastMetric, horizon: Horizon) {
  const historical = metric.points.filter((p) => p.isHistorical);
  const forecast = metric.points
    .filter((p) => !p.isHistorical)
    .slice(0, HORIZON_COUNTS[horizon]);

  return [...historical, ...forecast].map((p) => ({
    period: p.period,
    historicalValue: p.isHistorical ? p.value : undefined,
    forecastValue: !p.isHistorical ? p.value : undefined,
    bandHigh: !p.isHistorical && p.high !== undefined ? p.high : undefined,
    bandLow: !p.isHistorical && p.low !== undefined ? p.low : undefined,
  }));
}

async function downloadForecastPptx(projectId: string) {
  const res = await fetch(`/api/analytics/${projectId}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "forecast-pptx" }),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error ?? "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "forecast.pptx";
  a.click();
  URL.revokeObjectURL(url);
}

export function AnalyticsForecastPanel({ projectId }: Props) {
  const dashboard = useAnalyticsStore((s) => s.dashboard);
  const forecastReport = useAnalyticsStore((s) => s.forecastReport);
  const forecastStatus = useAnalyticsStore((s) => s.forecastStatus);
  const forecastError = useAnalyticsStore((s) => s.forecastError);
  const setForecastReport = useAnalyticsStore((s) => s.setForecastReport);
  const setForecastStatus = useAnalyticsStore((s) => s.setForecastStatus);
  const setForecastError = useAnalyticsStore((s) => s.setForecastError);

  const handleGenerate = useCallback(async () => {
    setForecastError("");
    setForecastStatus("generating");
    try {
      const res = await fetch(`/api/analytics/${projectId}/forecast`, {
        method: "POST",
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        setForecastError(err.error ?? "Generation failed");
        return;
      }
      const data = (await res.json()) as { data?: { report?: unknown } };
      const parsed = forecastReportSchema.safeParse(data.data?.report);
      if (!parsed.success) {
        setForecastError("Invalid response from server");
        return;
      }
      setForecastReport(parsed.data);
    } catch (err) {
      setForecastError(
        err instanceof Error ? err.message : "Generation failed"
      );
    }
  }, [projectId, setForecastReport, setForecastStatus, setForecastError]);

  if (!dashboard) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground">
          Run base analysis first to generate a forecast.
        </p>
      </div>
    );
  }

  if (forecastStatus === "generating") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground text-center">
          Generating forecast…
          <br />
          This may take 30–60 seconds.
        </p>
      </div>
    );
  }

  if (forecastStatus !== "ready" || !forecastReport) {
    return (
      <div className="flex flex-col gap-3 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          Generate a 24-month financial forecast with confidence intervals.
        </p>
        {forecastStatus === "error" && forecastError && (
          <p className="text-xs text-red-500">{forecastError}</p>
        )}
        <Button
          size="sm"
          className="w-full gap-1.5"
          onClick={() => void handleGenerate()}
        >
          <LineChart className="w-3.5 h-3.5" />
          Generate Forecast
        </Button>
      </div>
    );
  }

  return (
    <ReadyState
      projectId={projectId}
      report={forecastReport}
      handleGenerate={handleGenerate}
    />
  );
}

function ReadyState({
  projectId,
  report,
  handleGenerate,
}: {
  projectId: string;
  report: ForecastReport;
  handleGenerate: () => Promise<void>;
}) {
  const [selectedMetric, setSelectedMetric] = useState(0);
  const [horizon, setHorizon] = useState<Horizon>("12m");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const metric = report.metrics[selectedMetric]!;
  const chartData = buildChartData(metric, horizon);

  return (
    <div className="flex flex-col gap-3 py-3">
      {/* Metric selector pills */}
      <div className="flex flex-wrap gap-1 p-3 pb-0">
        {report.metrics.map((m, i) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setSelectedMetric(i)}
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[11px] font-medium border transition-colors",
              selectedMetric === i
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Horizon toggle */}
      <div className="flex gap-1 px-3">
        {(["6m", "12m", "24m"] as const).map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            className={cn(
              "flex-1 rounded text-[11px] py-0.5 border transition-colors",
              horizon === h
                ? "bg-primary/10 border-primary/40 text-primary"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            {h}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="px-3">
        <ResponsiveContainer width="100%" height={160}>
          <ComposedChart
            data={chartData}
            margin={{ top: 8, right: 4, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="period"
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) =>
                `${metric.unit}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`
              }
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                fontSize: 11,
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            {/* Confidence band */}
            <Area
              dataKey="bandHigh"
              fill="hsl(var(--primary) / 0.15)"
              stroke="none"
              connectNulls
              isAnimationActive={false}
            />
            <Area
              dataKey="bandLow"
              fill="hsl(var(--card))"
              stroke="none"
              connectNulls
              isAnimationActive={false}
            />
            {/* Historical line */}
            <Area
              dataKey="historicalValue"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              fill="hsl(var(--primary) / 0.08)"
              connectNulls
              dot={false}
            />
            {/* Forecast line */}
            <Line
              dataKey="forecastValue"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              connectNulls
              dot={false}
            />
            <ReferenceLine
              x={report.basePeriod}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Metric info */}
      <div className="px-3 flex items-center justify-between">
        <span
          className={cn(
            "text-[11px] font-medium",
            metric.trend === "up"
              ? "text-green-500"
              : metric.trend === "down"
                ? "text-red-500"
                : "text-muted-foreground"
          )}
        >
          {metric.trend === "up" ? "↑" : metric.trend === "down" ? "↓" : "→"}{" "}
          {metric.projectedCagr ?? ""}
        </span>
      </div>

      {/* Narrative */}
      <p className="px-3 text-[11px] text-muted-foreground leading-relaxed">
        {metric.narrative}
      </p>

      {/* Download button */}
      <div className="px-3 flex flex-col gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="w-full gap-1.5 text-xs"
          disabled={downloading}
          onClick={async () => {
            setDownloading(true);
            setDownloadError(null);
            try {
              await downloadForecastPptx(projectId);
            } catch (err) {
              setDownloadError(
                err instanceof Error ? err.message : "Download failed"
              );
            } finally {
              setDownloading(false);
            }
          }}
        >
          {downloading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Download className="w-3 h-3" />
          )}
          Download Forecast PPTX
        </Button>
        {downloadError && (
          <p className="text-xs text-red-500">{downloadError}</p>
        )}
      </div>

      {/* Regenerate button */}
      <Button
        variant="ghost"
        size="sm"
        className="mx-3 gap-1.5 text-xs text-muted-foreground"
        onClick={() => void handleGenerate()}
      >
        <ChevronRight className="w-3 h-3" />
        Regenerate
      </Button>
    </div>
  );
}

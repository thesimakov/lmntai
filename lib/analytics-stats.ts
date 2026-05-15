import {
  linearRegression,
  linearRegressionLine,
} from "simple-statistics";
import type { AnalysisDashboard } from "@/lib/analytics-schema";

export interface TrendResult {
  slope: number;
  intercept: number;
  cagr: number | null;
  movingAvg3: number | null;
  lastValue: number | null;
  projectedNext: number | null;
  projectedIn3: number | null;
}

function numericPairs(points: { x: unknown; y: unknown }[]): [number, number][] {
  return points
    .map((p, i) => [i, Number(p.y ?? p.x)] as [number, number])
    .filter(([, y]) => isFinite(y));
}

function extractChartPoints(data: Record<string, unknown>[]): [number, number][] {
  if (data.length < 2) return [];
  const keys = Object.keys(data[0] ?? {});
  // Prefer numeric-looking value keys (revenue, value, y, amount, etc.)
  const valueKey = keys.find((k) => {
    const sample = data.find((r) => r[k] !== undefined);
    return typeof sample?.[k] === "number" || (typeof sample?.[k] === "string" && isFinite(Number(sample[k])));
  });
  if (!valueKey) return [];
  return data
    .map((row, i) => [i, Number(row[valueKey])] as [number, number])
    .filter(([, y]) => isFinite(y));
}

export function computeChartTrend(data: Record<string, unknown>[]): TrendResult | null {
  const pairs = extractChartPoints(data);
  if (pairs.length < 2) return null;

  const reg = linearRegression(pairs);
  const line = linearRegressionLine(reg);

  const lastIdx = pairs.length - 1;
  const lastValue = pairs[lastIdx]![1];
  const firstValue = pairs[0]![1];
  const n = pairs.length;

  const cagr =
    firstValue > 0 && lastValue > 0 && n > 1
      ? Math.pow(lastValue / firstValue, 1 / (n - 1)) - 1
      : null;

  const movingAvg3 =
    pairs.length >= 3
      ? (pairs[lastIdx]![1] + pairs[lastIdx - 1]![1] + pairs[lastIdx - 2]![1]) / 3
      : null;

  const projectedNext = line(lastIdx + 1);
  const projectedIn3 = line(lastIdx + 3);

  return {
    slope: reg.m,
    intercept: reg.b,
    cagr,
    movingAvg3,
    lastValue,
    projectedNext,
    projectedIn3,
  };
}

export interface DashboardStats {
  chartTrends: Record<string, TrendResult>;
  kpiSummary: { label: string; value: string; change?: string }[];
}

export function computeDashboardStats(dashboard: AnalysisDashboard): DashboardStats {
  const chartTrends: Record<string, TrendResult> = {};

  for (const chart of dashboard.charts) {
    if (chart.data.length >= 2) {
      const trend = computeChartTrend(chart.data as Record<string, unknown>[]);
      if (trend) chartTrends[chart.title] = trend;
    }
  }

  const kpiSummary = dashboard.kpis.map((k) => ({
    label: k.label,
    value: k.value,
    change: k.change,
  }));

  return { chartTrends, kpiSummary };
}

export function formatStatsForPrompt(stats: DashboardStats): string {
  const lines: string[] = ["=== Statistical Pre-computation ==="];

  for (const [title, trend] of Object.entries(stats.chartTrends)) {
    lines.push(`\n[${title}]`);
    if (trend.cagr !== null) {
      lines.push(`  CAGR: ${(trend.cagr * 100).toFixed(1)}%`);
    }
    lines.push(`  Linear slope: ${trend.slope.toFixed(2)} per period`);
    if (trend.movingAvg3 !== null) {
      lines.push(`  3-period moving avg: ${trend.movingAvg3.toFixed(2)}`);
    }
    if (trend.projectedNext !== null) {
      lines.push(`  Next-period projection (linear): ${trend.projectedNext.toFixed(2)}`);
    }
    if (trend.projectedIn3 !== null) {
      lines.push(`  3-period projection (linear): ${trend.projectedIn3.toFixed(2)}`);
    }
  }

  if (stats.kpiSummary.length > 0) {
    lines.push("\n[KPI Snapshot]");
    for (const kpi of stats.kpiSummary) {
      const change = kpi.change !== undefined ? ` (Δ ${kpi.change})` : "";
      lines.push(`  ${kpi.label}: ${kpi.value}${change}`);
    }
  }

  return lines.join("\n");
}

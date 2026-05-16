import { forecastReportSchema, type ForecastReport } from "@/lib/forecast-schema";

const MIN_METRICS = 3;
const MAX_METRICS = 5;

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, "");
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toTrend(value: unknown): "up" | "down" | "neutral" {
  const normalized = asString(value).trim().toLowerCase();
  if (["up", "рост", "growing", "increase", "повышение", "баланд"].includes(normalized)) return "up";
  if (["down", "снижение", "decline", "decrease", "паст"].includes(normalized)) return "down";
  return "neutral";
}

function toIso(raw: unknown): string {
  const s = asString(raw).trim();
  if (s && !Number.isNaN(Date.parse(s))) return new Date(s).toISOString();
  return new Date().toISOString();
}

function toBoolean(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const s = asString(raw).trim().toLowerCase();
  return s === "true" || s === "1" || s === "historical";
}

function normalizePoint(raw: unknown, idx: number) {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const isHistorical = toBoolean(obj.isHistorical);
  const value = toNumber(obj.value, 0);
  const low = obj.low === undefined ? undefined : toNumber(obj.low, value * 0.9);
  const high = obj.high === undefined ? undefined : toNumber(obj.high, value * 1.1);

  return {
    period: asString(obj.period, `P${idx + 1}`),
    value,
    isHistorical,
    ...(isHistorical ? {} : { low: low ?? value * 0.9, high: high ?? value * 1.1 }),
  };
}

function normalizeMetric(raw: unknown, idx: number) {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawPoints = Array.isArray(obj.points) ? obj.points : [];
  const points =
    rawPoints.length > 0
      ? rawPoints.map((p, i) => normalizePoint(p, i))
      : [{ period: "P1", value: 0, isHistorical: true }];

  return {
    key: asString(obj.key, `metric_${idx + 1}`),
    label: asString(obj.label, `Metric ${idx + 1}`),
    unit: asString(obj.unit, ""),
    points,
    trend: toTrend(obj.trend),
    projectedCagr: asString(obj.projectedCagr),
    narrative: asString(obj.narrative, ""),
  };
}

export function normalizeForecastReport(raw: unknown): ForecastReport | null {
  const root = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rawMetrics = Array.isArray(root.metrics) ? root.metrics : [];
  let metrics = rawMetrics.map((m, i) => normalizeMetric(m, i));

  while (metrics.length < MIN_METRICS) {
    metrics.push(
      normalizeMetric(
        {
          key: `metric_${metrics.length + 1}`,
          label: `Metric ${metrics.length + 1}`,
          unit: "",
          trend: "neutral",
          narrative: "",
          points: [{ period: "P1", value: 0, isHistorical: true }],
        },
        metrics.length
      )
    );
  }

  if (metrics.length > MAX_METRICS) {
    metrics = metrics.slice(0, MAX_METRICS);
  }

  const normalized: unknown = {
    generatedAt: toIso(root.generatedAt),
    basePeriod: asString(root.basePeriod, "base"),
    executiveSummary: asString(root.executiveSummary, ""),
    metrics,
  };

  const parsed = forecastReportSchema.safeParse(normalized);
  if (!parsed.success) return null;
  return parsed.data;
}

"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import type { Chart } from "@/lib/analytics-schema";
import { useI18n } from "@/components/i18n-provider";

const PALETTE = ["#3D7FA6", "#7C5CBF", "#3A8A65", "#C08A2A", "#9A4535", "#5B8DEF"];

const CHART_HEIGHT = 300;

function chartLocale(lang: string): string {
  if (lang === "en") return "en-US";
  if (lang === "tg") return "tg-TJ";
  return "ru-RU";
}

function formatAxisNumber(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function normalizeChartRows(
  data: Chart["data"]
): Array<{ name: string; value: number }> {
  return data
    .map((row) => {
      const name = typeof row.name === "string" ? row.name : String(row.name ?? "");
      const raw = row.value;
      const value =
        typeof raw === "number"
          ? raw
          : typeof raw === "string"
            ? Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."))
            : 0;
      return { name, value: Number.isFinite(value) ? value : 0 };
    })
    .filter((row) => row.name.trim().length > 0);
}

type TooltipPayload = { name?: string; value?: number; color?: string };

function AnalyticsChartTooltip({
  active,
  payload,
  label,
  locale,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border/80 bg-white/95 px-3 py-2 shadow-md backdrop-blur-sm">
      {label ? <p className="mb-1.5 text-xs font-semibold text-foreground">{label}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color ?? PALETTE[0] }}
              />
              {entry.name}
            </span>
            <span className="font-medium tabular-nums text-foreground">
              {formatAxisNumber(Number(entry.value ?? 0), locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface Props {
  chart: Chart;
}

export function AnalyticsChartBlock({ chart }: Props) {
  const { lang } = useI18n();
  const locale = chartLocale(lang);
  const { type, title, description } = chart;
  const rows = useMemo(() => normalizeChartRows(chart.data), [chart.data]);

  const useHorizontalBars =
    type === "bar" || type === "waterfall"
      ? rows.length > 4 || rows.some((r) => r.name.length > 14)
      : false;

  const chartMargin = useHorizontalBars
    ? { top: 8, right: 16, left: 8, bottom: 8 }
    : { top: 12, right: 12, left: 4, bottom: 4 };

  return (
    <div className="rounded-xl border border-border/70 bg-gradient-to-b from-white to-zinc-50/80 p-4 shadow-sm">
      <div className="mb-3 space-y-1">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{title}</h3>
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="h-[300px] w-full min-w-0">
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          {type === "pie" ? (
            <PieChart>
              <defs>
                {PALETTE.map((color, i) => (
                  <linearGradient key={color} id={`pie-grad-${i}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.65} />
                  </linearGradient>
                ))}
              </defs>
              <Pie
                data={rows}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={92}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={2}
              >
                {rows.map((_, i) => (
                  <Cell key={i} fill={`url(#pie-grad-${i % PALETTE.length})`} />
                ))}
              </Pie>
              <Tooltip content={<AnalyticsChartTooltip locale={locale} />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                wrapperStyle={{ fontSize: 11, paddingLeft: 8 }}
              />
            </PieChart>
          ) : type === "line" ? (
            <LineChart data={rows} margin={chartMargin}>
              <defs>
                <linearGradient id="line-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={rows.length > 5 ? -24 : 0}
                textAnchor={rows.length > 5 ? "end" : "middle"}
                height={rows.length > 5 ? 52 : 28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatAxisNumber(Number(v), locale)}
                width={56}
              />
              <Tooltip content={<AnalyticsChartTooltip locale={locale} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={PALETTE[0]}
                strokeWidth={2.5}
                dot={{ r: 3, fill: PALETTE[0], strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "#fff", stroke: PALETTE[0], strokeWidth: 2 }}
              />
            </LineChart>
          ) : type === "area" ? (
            <AreaChart data={rows} margin={chartMargin}>
              <defs>
                <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={PALETTE[0]} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatAxisNumber(Number(v), locale)}
                width={56}
              />
              <Tooltip content={<AnalyticsChartTooltip locale={locale} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={PALETTE[0]}
                strokeWidth={2}
                fill="url(#area-fill)"
              />
            </AreaChart>
          ) : useHorizontalBars ? (
            <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }}>
              <defs>
                <linearGradient id="bar-h-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.85} />
                  <stop offset="100%" stopColor={PALETTE[1]} stopOpacity={0.95} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatAxisNumber(Number(v), locale)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: "#52525B" }}
                axisLine={false}
                tickLine={false}
                width={Math.min(140, Math.max(72, ...rows.map((r) => r.name.length * 6)))}
              />
              <Tooltip content={<AnalyticsChartTooltip locale={locale} />} />
              <Bar dataKey="value" fill="url(#bar-h-grad)" radius={[0, 6, 6, 0]} maxBarSize={28} />
            </BarChart>
          ) : (
            <BarChart data={rows} margin={chartMargin}>
              <defs>
                <linearGradient id="bar-v-grad" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0%" stopColor={PALETTE[0]} stopOpacity={0.75} />
                  <stop offset="100%" stopColor={PALETTE[1]} stopOpacity={1} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E4E4E7" strokeDasharray="4 6" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                interval={0}
                angle={rows.length > 4 ? -22 : 0}
                textAnchor={rows.length > 4 ? "end" : "middle"}
                height={rows.length > 4 ? 48 : 28}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#71717A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatAxisNumber(Number(v), locale)}
                width={56}
              />
              <Tooltip content={<AnalyticsChartTooltip locale={locale} />} />
              <Bar dataKey="value" fill="url(#bar-v-grad)" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

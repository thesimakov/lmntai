import type { AnalysisDashboard } from "@/lib/analytics-schema";
import { useI18n } from "@/components/i18n-provider";
import type { ForecastReport, ForecastMetric } from "@/lib/forecast-schema";
import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import { AnalyticsChartBlock } from "./analytics-chart-block";

interface Props {
  dashboard: AnalysisDashboard;
  forecastReport?: ForecastReport | null;
}

const METRIC_LABELS: Record<string, { ru: string; en: string; tg: string }> = {
  revenue: { ru: "Общая выручка", en: "Total Revenue", tg: "Даромади умумӣ" },
  burn_rate: { ru: "Месячные расходы на разработку", en: "Monthly Development Costs", tg: "Хароҷоти моҳонаи рушд" },
  mrr: { ru: "Ежемесячный регулярный доход (подписки)", en: "Monthly Recurring Revenue (Subscriptions)", tg: "Даромади такрории моҳона (обуна)" },
  gross_profit: { ru: "Валовая прибыль", en: "Gross Profit", tg: "Фоидаи умумӣ" },
  runway: { ru: "Финансовый runway", en: "Cash Runway", tg: "Runway-и нақдӣ" },
  ebitda: { ru: "EBITDA", en: "EBITDA", tg: "EBITDA" },
};

function localizedMetricLabel(metric: ForecastMetric, lang: string): string {
  const langKey = lang === "en" ? "en" : lang === "tg" ? "tg" : "ru";
  return METRIC_LABELS[metric.key]?.[langKey] ?? metric.label;
}

export function AnalyticsDashboard({ dashboard, forecastReport }: Props) {
  const { t, lang } = useI18n();
  const { summary, kpis, charts, tables } = dashboard;
  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <AnalyticsKpiGrid kpis={kpis} />

      {charts.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {charts.slice(0, 4).map((chart) => (
            <AnalyticsChartBlock key={chart.id} chart={chart} />
          ))}
        </div>
      )}

      {forecastReport && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <h3 className="font-semibold text-sm">
            {lang === "en" ? "Financial Forecast (24 months)" : lang === "tg" ? "Пешгӯии молиявӣ (24 моҳ)" : "Финансовый прогноз (24 месяца)"}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
            {forecastReport.executiveSummary}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {forecastReport.metrics.map((metric) => {
              const latestPoint = [...metric.points].reverse().find((p) => !p.isHistorical) ?? metric.points[metric.points.length - 1];
              return (
                <div key={metric.key} className="rounded-lg border border-border/60 p-3 space-y-1">
                  <p className="text-xs text-muted-foreground break-words">{localizedMetricLabel(metric, lang)}</p>
                  <p className="text-base font-semibold break-words">
                    {metric.unit}
                    {latestPoint?.value.toLocaleString() ?? "—"}
                  </p>
                  {metric.projectedCagr && (
                    <p className="text-xs text-primary">{metric.projectedCagr}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{t("analytics_bi_summary_title")}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.executive}
        </p>
      </div>

      {summary.redFlags.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <h3 className="font-semibold text-sm text-red-500">{t("analytics_bi_red_flags_title")}</h3>
          <ul className="space-y-1">
            {summary.redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2 break-words">
                <span className="text-red-500 shrink-0">⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tables.map((table) => (
        <div key={table.title} className="rounded-xl border bg-card p-4 h-auto overflow-visible">
          <h3 className="font-semibold text-sm mb-3 whitespace-normal break-words">{table.title}</h3>
          <table className="w-full text-xs table-auto">
            <thead>
              <tr className="border-b">
                {table.headers.map((h) => (
                  <th key={h} className="text-left py-1.5 pr-4 text-muted-foreground font-medium whitespace-normal break-words align-top">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1.5 pr-4 whitespace-normal break-words align-top leading-relaxed">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

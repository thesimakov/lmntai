import type { AnalysisDashboard } from "@/lib/analytics-schema";
import { AnalyticsKpiGrid } from "./analytics-kpi-grid";
import { AnalyticsChartBlock } from "./analytics-chart-block";

interface Props { dashboard: AnalysisDashboard }

export function AnalyticsDashboard({ dashboard }: Props) {
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

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">Executive Summary</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.executive}
        </p>
      </div>

      {summary.redFlags.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-2">
          <h3 className="font-semibold text-sm text-red-500">Red Flags</h3>
          <ul className="space-y-1">
            {summary.redFlags.map((flag, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-red-500 shrink-0">⚠</span>
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tables.map((table) => (
        <div key={table.title} className="rounded-xl border bg-card p-4 overflow-x-auto">
          <h3 className="font-semibold text-sm mb-3">{table.title}</h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b">
                {table.headers.map((h) => (
                  <th key={h} className="text-left py-1.5 pr-4 text-muted-foreground font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} className="border-b border-border/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="py-1.5 pr-4">{cell}</td>
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

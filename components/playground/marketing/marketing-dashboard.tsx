"use client";

import type { MarketingDashboard } from "@/lib/marketing-schema";
import { MarketingKpiRow } from "./marketing-kpi-row";
import { MarketingChannelCard } from "./marketing-channel-card";
import { MarketingChartBlock } from "./marketing-chart-block";

export function MarketingDashboard({ dashboard }: { dashboard: MarketingDashboard }) {
  const { kpis, channels, summary } = dashboard;
  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <MarketingKpiRow kpis={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {channels.map((ch) => (
          <MarketingChannelCard key={ch.name} channel={ch} />
        ))}
      </div>

      <MarketingChartBlock channels={channels} />

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">Executive Summary</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.executive}
        </p>
      </div>

      {summary.recommendations.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">Recommendations</h3>
          <ul className="space-y-1">
            {summary.recommendations.map((rec, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-primary shrink-0">•</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary.topFindings.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">Top Findings</h3>
          <ul className="space-y-1">
            {summary.topFindings.map((finding, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-amber-500 shrink-0">{i + 1}.</span>
                {finding}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

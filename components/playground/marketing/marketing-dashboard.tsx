"use client";

import type { MarketingDashboard } from "@/lib/marketing-schema";
import { useI18n } from "@/components/i18n-provider";
import { MarketingKpiRow } from "./marketing-kpi-row";
import { MarketingChannelCard } from "./marketing-channel-card";
import { MarketingChartBlock } from "./marketing-chart-block";

export function MarketingDashboard({ dashboard }: { dashboard: MarketingDashboard }) {
  const { t } = useI18n();
  const { kpis, channels, summary, meta, narrative } = dashboard;
  return (
    <div className="flex flex-col gap-6 p-4 overflow-y-auto h-full">
      <div className="space-y-0.5">
        <p className="font-semibold text-base leading-tight">{meta.companyName}</p>
        <p className="text-sm text-muted-foreground">{meta.period}</p>
        <p className="text-xs text-muted-foreground">{meta.dataSource}</p>
      </div>

      <MarketingKpiRow kpis={kpis} />

      <div className="flex flex-col gap-4">
        {channels.map((ch) => (
          <MarketingChannelCard key={ch.name} channel={ch} />
        ))}
      </div>

      <MarketingChartBlock channels={channels} />

      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="font-semibold text-sm">{t("marketing_bi_summary_title")}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
          {summary.executive}
        </p>
      </div>

      {summary.recommendations.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">{t("marketing_bi_recommendations_title")}</h3>
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
          <h3 className="font-semibold text-sm">{t("marketing_bi_top_findings_title")}</h3>
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

      {narrative && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">{t("marketing_bi_narrative_title")}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {narrative}
          </p>
        </div>
      )}
    </div>
  );
}

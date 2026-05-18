"use client";

import { useI18n } from "@/components/i18n-provider";
import { localizeMarketingKpiLabel } from "@/lib/marketing-dashboard-localization";
import type { MarketingKpi } from "@/lib/marketing-schema";
import { MarketingTrendBadge } from "./marketing-trend-badge";

export function MarketingKpiRow({ kpis }: { kpis: MarketingKpi[] }) {
  const { lang } = useI18n();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.slice(0, 4).map((kpi) => {
        return (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-4 flex flex-col gap-1"
          >
            <span className="text-[15px] text-muted-foreground whitespace-normal break-words line-clamp-2">
              {localizeMarketingKpiLabel(kpi.label, lang)}
            </span>
            <span className="text-xl font-bold tracking-tight">{kpi.value}</span>
            {kpi.change ? (
              <MarketingTrendBadge trend={kpi.trend} suffix={kpi.change} />
            ) : (
              <MarketingTrendBadge trend={kpi.trend} />
            )}
          </div>
        );
      })}
    </div>
  );
}

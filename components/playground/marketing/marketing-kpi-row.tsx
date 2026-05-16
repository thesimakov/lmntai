"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { localizeMarketingKpiLabel } from "@/lib/marketing-dashboard-localization";
import type { MarketingKpi } from "@/lib/marketing-schema";

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const TREND_COLOR = {
  up: "text-green-500",
  down: "text-red-500",
  neutral: "text-muted-foreground",
};

export function MarketingKpiRow({ kpis }: { kpis: MarketingKpi[] }) {
  const { lang } = useI18n();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {kpis.slice(0, 4).map((kpi) => {
        const Icon = TREND_ICON[kpi.trend];
        return (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-4 flex flex-col gap-1"
          >
            <span className="text-xs text-muted-foreground whitespace-normal break-words line-clamp-2">
              {localizeMarketingKpiLabel(kpi.label, lang)}
            </span>
            <span className="text-xl font-bold tracking-tight">{kpi.value}</span>
            {kpi.change && (
              <div className={cn("flex items-center gap-1 text-xs", TREND_COLOR[kpi.trend])}>
                <Icon className="w-3 h-3" />
                {kpi.change}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

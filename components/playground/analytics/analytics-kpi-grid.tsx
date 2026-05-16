import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/analytics-schema";

interface Props { kpis: Kpi[] }

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

export function AnalyticsKpiGrid({ kpis }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {kpis.slice(0, 6).map((kpi) => {
        const Icon = TREND_ICON[kpi.trend];
        return (
          <div
            key={kpi.label}
            className="rounded-xl border bg-card p-4 flex flex-col gap-1 min-h-[96px]"
          >
            <span className="text-xs text-muted-foreground leading-snug whitespace-normal break-words line-clamp-2">{kpi.label}</span>
            <span className="text-lg font-bold tracking-tight leading-snug whitespace-normal break-words">{kpi.value}</span>
            {kpi.change && (
              <div className={cn("flex items-center gap-1 text-xs whitespace-normal break-words", TREND_COLOR[kpi.trend])}>
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
